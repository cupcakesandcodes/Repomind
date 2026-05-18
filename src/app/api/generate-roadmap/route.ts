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

    const prompt = `You are a senior open source mentor. Generate a highly personalized contribution roadmap in JSON format. Keep all task titles and descriptions extremely punchy, concise, and direct.

Return only valid JSON. No preamble. No explanation outside the JSON.

## Developer Profile (Real GitHub Data)
${JSON.stringify(profileSummary, null, 2)}

## WHAT THIS DEVELOPER HAS ALREADY ACCOMPLISHED — DO NOT ASSIGN THESE AS TASKS
- They have ${prsRaised} PRs raised
- They have ${prsMerged} PRs merged
- They have ${forkedRepos.length} forked repos

## Current Stage Assessment: ${currentStage}
- ABSOLUTE_BEGINNER: Zero PRs. Needs basic documentation/first-fork help.
- BEGINNER_WITH_CODE: Has personal repos, no external contributions. Start with reading code and small doc fixes.
- BEGINNER_WITH_EXPOSURE: Opened PR before but not merged. Focus on getting a merge.
- INTERMEDIATE: 3-10 PRs. Ready for real bug fixes.
- EXPERIENCED / ADVANCED: 10+ PRs. Jump straight to reviews and core issues.

## Their Goal
${goal || 'Get started with open source contributions'}

## Time Available
${hoursPerWeek || '5'} hours per week
${regenBlock}

## Output JSON Structure
{
  "level": "${currentStage}",
  "levelLabel": "e.g. Promising Beginner",
  "totalWeeks": ${currentStage.includes('BEGINNER') ? '4' : '3'},
  "summary": "Short 2-sentence encouraging summary addressing ${user.name || user.login} by name.",
  "phases": [
    {
      "id": 1,
      "name": "Phase name",
      "weeks": "1-2",
      "description": "Short objective",
      "tasks": [
        {
          "id": "1-1",
          "week": 1,
          "day": "Mon",
          "title": "Actionable title (e.g. 'Fork repo and run locally')",
          "description": "Short instructions (under 15 words).",
          "timeEstimate": "30 min",
          "verifyType": "auto_fork|auto_commit|auto_pr|auto_pr_merged|auto_star|auto_issue_comment|manual",
          "verifyDescription": "Verification description",
          "xp": 20,
          "suggestedRepo": null,
          "whyItMatters": "Why it matters (under 10 words)"
        }
      ]
    }
  ],
  "suggestedRepos": [
    { "name": "owner/repo", "why": "short reason (under 12 words)", "difficulty": "easy|medium|hard", "goodFirstIssues": true }
  ],
  "milestones": [
    { "week": 2, "title": "First PR Opened", "badge": "🚀 Launcher", "requirement": "Open a PR to an external repo" }
  ]
}

## CRITICAL RULES FOR SPEED (STRICTLY ENFORCED)
1. Keep the roadmap short: Generate 4 weeks total for Beginners, and 3 weeks total for Intermediate/Advanced.
2. Under "phases", only generate 2 phases maximum.
3. Keep task density low: Generate exactly 2 tasks per week (e.g., Mon and Thu). Do NOT generate daily tasks.
4. Keep all text fields (description, whyItMatters, summary) extremely concise (under 15 words each).
5. Recommended repos: Include exactly 3 suggested repos.
6. The "suggestedRepo" field inside tasks must ALWAYS be null.`;

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
