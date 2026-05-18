import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { username, goal, hoursPerWeek, preference, regenerationContext } = await req.json();
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 400 });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // ── GATHER FULL GITHUB PROFILE ──
    const [userRes, reposRes] = await Promise.all([
      octokit.users.getByUsername({ username }),
      octokit.repos.listForUser({ username, sort: 'pushed', per_page: 100, type: 'owner' }),
    ]);
    const user = userRes.data;
    const repos = reposRes.data;

    // Language stats
    const langMap: Record<string, number> = {};
    repos.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1; });
    const topLangs = Object.entries(langMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([l,c]) => `${l} (${c} repos)`);

    // PR stats
    const [mergedRes, raisedRes, issuesRes] = await Promise.all([
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:pr is:merged`, per_page: 1 }).catch(() => ({ data: { total_count: 0 } })),
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:pr`, per_page: 1 }).catch(() => ({ data: { total_count: 0 } })),
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:issue`, per_page: 1 }).catch(() => ({ data: { total_count: 0 } })),
    ]);

    // External contributions
    const forkedRepos = repos.filter(r => r.fork);
    const personalRepos = repos.filter(r => !r.fork);

    // Recent activity + recent PR details
    const events = await octokit.activity.listPublicEventsForUser({ username, per_page: 100 }).then(r => r.data).catch(() => []);
    const recentPRRepos = new Set<string>();
    const recentPRTitles: string[] = [];
    events.forEach((e: any) => {
      if (e.type === 'PullRequestEvent' || e.type === 'PushEvent') recentPRRepos.add(e.repo?.name || '');
      if (e.type === 'PullRequestEvent') recentPRTitles.push(`${(e.payload as any)?.action}: ${(e.payload as any)?.pull_request?.title} in ${e.repo?.name}`);
    });

    // Streak via GraphQL
    let streak = 0;
    let weeklyAvg = 0;
    try {
      const gql = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { 'Authorization': `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount}}}}}}`,
          variables: { u: username },
        }),
      }).then(r => r.json());
      const cal = gql?.data?.user?.contributionsCollection?.contributionCalendar;
      const days = (cal?.weeks || []).flatMap((w:any) => w.contributionDays).reverse();
      for (const d of days) { if (d.contributionCount > 0) streak++; else break; }
      weeklyAvg = Math.round((cal?.totalContributions || 0) / 52);
    } catch {}

    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const avgRepoSize = repos.length > 0 ? Math.round(repos.reduce((s, r) => s + (r.size || 0), 0) / repos.length) : 0;

    // Determine current stage
    const prsMerged = mergedRes.data.total_count;
    const prsRaised = raisedRes.data.total_count;
    const hasExternalContribs = forkedRepos.length > 0 || recentPRRepos.size > personalRepos.length;
    let currentStage = 'ABSOLUTE_BEGINNER';
    if (prsMerged >= 50 && hasExternalContribs) currentStage = 'ADVANCED';
    else if (prsMerged >= 10 && hasExternalContribs) currentStage = 'EXPERIENCED';
    else if (prsMerged >= 10 && !hasExternalContribs) currentStage = 'EXPERIENCED_NEWCOMER';
    else if (prsMerged >= 3) currentStage = 'INTERMEDIATE';
    else if (prsRaised >= 1) currentStage = 'BEGINNER_WITH_EXPOSURE';
    else if (repos.length > 5) currentStage = 'BEGINNER_WITH_CODE';

    const profileSummary = {
      username: user.login,
      name: user.name || user.login,
      bio: user.bio || 'None',
      publicRepos: user.public_repos,
      followers: user.followers,
      accountAge: `${Math.round((Date.now() - new Date(user.created_at).getTime()) / (365.25 * 86400000))} years`,
      topLanguages: topLangs,
      prsRaised,
      prsMerged,
      issuesOpened: issuesRes.data.total_count,
      forkedRepos: forkedRepos.length,
      personalRepos: personalRepos.length,
      externalContributions: recentPRRepos.size,
      currentStreak: streak,
      weeklyAvgContributions: weeklyAvg,
      totalStars,
      avgRepoSize,
      recentlyActive: events.length > 20,
      currentStage,
      recentPRActivity: recentPRTitles.slice(0, 5),
      recentActiveRepos: Array.from(recentPRRepos).slice(0, 5),
    };

    // ── SEND TO GEMINI ──
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-flash-latest",
      temperature: 0.7,
    });

    const regenBlock = regenerationContext ? `
## REGENERATION CONTEXT — THIS IS A ROADMAP UPDATE
The developer already had a roadmap. Here's what changed:
- Tasks completed so far: ${regenerationContext.completedCount || 0}
- Original pace: ${regenerationContext.originalPace || 'unknown'}
- Actual pace: ${regenerationContext.actualPace || 'unknown'}
- Reason for regeneration: ${regenerationContext.reason || 'Manual refresh'}
- Message to developer: Start your summary by acknowledging their progress: "${regenerationContext.paceNote || ''}"
- Adapt the difficulty and pace based on their actual performance. If they're ahead, compress. If behind, break tasks into smaller steps. Always compare them only to their past self.
` : '';

    const prompt = `You are a senior open source mentor. Generate a personalised contribution roadmap in JSON format. Be specific — name actual repos, actual issue types, actual tasks. Never be vague. Every task must be actionable today.

Return only valid JSON. No preamble. No explanation outside the JSON.

## Developer Profile (Real GitHub Data)
${JSON.stringify(profileSummary, null, 2)}

## WHAT THIS DEVELOPER HAS ALREADY ACCOMPLISHED — DO NOT ASSIGN THESE AS TASKS
- They have ${prsRaised} PRs raised — do NOT include "open your first PR" type tasks if > 0
- They have ${prsMerged} PRs merged — do NOT include "get your first PR merged" if > 0
- They have ${forkedRepos.length} forked repos — do NOT include "fork a repo" if > 0
- They have ${profileSummary.issuesOpened} issues opened — do NOT include "open an issue" if > 0
- They have a ${streak}-day streak — do NOT include "start a streak" if > 3
- They contribute to ${recentPRRepos.size} repos — do NOT include basic setup tasks if > 2
- START the roadmap from their CURRENT level. If they already have 5 merged PRs, the first task should be something NEW they haven't done yet (like reviewing PRs, improving docs, tackling harder issues, etc.)
- The roadmap should push them to their NEXT level, not repeat what they've already done.

## Current Stage Assessment: ${currentStage}
- ABSOLUTE_BEGINNER: Has repos but zero PRs anywhere. Needs hand-holding from "what is a fork" level.
- BEGINNER_WITH_CODE: Has personal projects but never contributed externally. Start with reading CONTRIBUTING.md and making doc PRs.
- BEGINNER_WITH_EXPOSURE: Has opened a PR before but nothing merged. Focus on getting that first merge.
- INTERMEDIATE: 3-10 merged PRs. Ready for real bug fixes and feature work. Skip the basics.
- EXPERIENCED_NEWCOMER: 10+ merged PRs but only in own repos. Compress path — they know code, just need OSS etiquette.
- EXPERIENCED: 10-50 merged external PRs. Focus on becoming a recognized contributor / reviewer.
- ADVANCED: 50+ merged PRs. Path to maintainership, community leadership, mentoring.

## Their Goal
${goal || 'Get started with open source contributions'}

## Time Available
${hoursPerWeek || '5'} hours per week (${Math.round(parseInt(hoursPerWeek || '5') / 7 * 60)} minutes per day)
${regenBlock}
## Output JSON Structure
{
  "level": "${currentStage}",
  "levelLabel": "human readable name like 'Promising Beginner' or 'Rising Contributor'",
  "totalWeeks": number_based_on_stage,
  "summary": "2-3 sentence personalized summary addressing ${user.name || user.login} by name. Reference their actual stats. Be encouraging but honest about where they are.",
  "phases": [
    {
      "id": 1,
      "name": "Phase name",
      "weeks": "1-2",
      "description": "What this phase achieves",
      "tasks": [
        {
          "id": "1-1",
          "week": 1,
          "day": "Mon",
          "title": "Generic action — e.g. 'Fork a repo you're interested in and run it locally'",
          "description": "Step by step what to do. Be precise but don't name a specific repo. E.g. 'Pick a repo from the Suggested Repos list or find one yourself. Click Fork, clone to your machine, read the README, and run the project locally.'",
          "timeEstimate": "30 min",
          "verifyType": "auto_fork|auto_commit|auto_pr|auto_pr_merged|auto_star|auto_issue_comment|auto_pr_review|manual",
          "verifyDescription": "RepoMind checks: a new forked repo appears in your GitHub",
          "xp": 15,
          "suggestedRepo": null,
          "whyItMatters": "Gets you comfortable with navigating and running open source codebases"
        }
      ]
    }
  ],
  "suggestedRepos": [
    { "name": "owner/repo", "why": "specific reason based on their ${topLangs[0] || ''} stack", "difficulty": "easy|medium|hard", "goodFirstIssues": true }
  ],
  "milestones": [
    { "week": 2, "title": "First PR Opened", "badge": "🚀 Launcher", "requirement": "Open your first pull request to an external repo" }
  ]
}

## CRITICAL RULES
1. For weeks 1-2: generate DAY-BY-DAY tasks (Mon, Tue, Wed...). For remaining weeks: 2-3 tasks per week.
2. Name REAL repos from GitHub that match their stack: ${topLangs.join(', ')}. Pick repos that are active and have good-first-issues.
3. ${currentStage === 'ABSOLUTE_BEGINNER' || currentStage === 'BEGINNER_WITH_CODE' ? 'Start gentle: Week 1 is ONLY reading, starring, and forking. No code changes until Week 2.' : currentStage === 'INTERMEDIATE' ? 'Skip basics. Start with finding and claiming a real issue in Week 1.' : 'Jump straight to meaningful contributions. They know what they\'re doing.'}
4. Every task must be actionable TODAY — not "learn about X" but "go to github.com/X/Y/issues and filter by good-first-issue label"
5. XP range: 5 (star a repo) to 100 (get a complex PR merged). Scale based on actual difficulty.
6. verifyType must be auto_* for anything GitHub can detect. Only use "manual" for things like "read a file" or "join Discord".
7. Generate ${currentStage.includes('BEGINNER') ? '12' : currentStage === 'INTERMEDIATE' ? '8' : currentStage === 'EXPERIENCED_NEWCOMER' ? '6' : '4'} weeks total.
8. Include 4-6 suggested repos. Prioritize repos with recent activity and welcoming communities.
9. Milestones should feel like real achievements, not participation trophies.
10. Reference their actual stats in task descriptions: "You have ${prsMerged} merged PRs — time to make it ${prsMerged + 1}"
11. Task "suggestedRepo" MUST always be null. Do NOT tie any task to a specific repo. Tasks should be generic actions like "Fork a repo that interests you", "Open a PR to fix a documentation typo in any project", "Comment on a good-first-issue". The user picks their own repo.
12. Task titles must describe the ACTION, not a specific repo. Good: "Fork a repo and run it locally". Bad: "Fork vercel/next.js". Good: "Open your first Pull Request". Bad: "Open a PR to facebook/react".
13. Repo recommendations go ONLY in the "suggestedRepos" array at the bottom — these are suggestions the user can browse, not assignments. Include 5-8 repos with reasons why they're good for this developer's stack and level.`;

    const result = await model.invoke(prompt);
    let content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

    // Clean up response — strip markdown fences if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let roadmap;
    try {
      roadmap = JSON.parse(content);
    } catch (parseError) {
      console.error('[generate-roadmap] JSON parse failed:', content.substring(0, 500));
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: content.substring(0, 1000) }, { status: 500 });
    }

    // Attach profile for frontend
    roadmap.profile = profileSummary;

    console.log(`[generate-roadmap] Generated ${roadmap.totalWeeks}-week ${roadmap.level} roadmap for ${username}`);
    return NextResponse.json(roadmap);
  } catch (error: any) {
    console.error('Generate roadmap failed:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
