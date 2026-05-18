import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// Verifies quest completion by checking real GitHub activity
export async function POST(req: NextRequest) {
  try {
    const { username, questPath } = await req.json();
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Fetch real GitHub stats
    const [prsRaised, prsMerged, starsGiven, issuesOpened, issuesClosed, prReviews, reposCreated, events] = await Promise.all([
      // Total PRs opened
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:pr`, per_page: 1 })
        .then(r => r.data.total_count).catch(() => 0),
      // PRs merged
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:pr is:merged`, per_page: 1 })
        .then(r => r.data.total_count).catch(() => 0),
      // Stars given (from events)
      octokit.activity.listPublicEventsForUser({ username, per_page: 100 })
        .then(r => r.data.filter(e => e.type === 'WatchEvent').length).catch(() => 0),
      // Issues opened
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:issue`, per_page: 1 })
        .then(r => r.data.total_count).catch(() => 0),
      // Issues closed by user
      octokit.search.issuesAndPullRequests({ q: `author:${username} is:issue is:closed`, per_page: 1 })
        .then(r => r.data.total_count).catch(() => 0),
      // PR reviews (from events)
      octokit.activity.listPublicEventsForUser({ username, per_page: 100 })
        .then(r => r.data.filter(e => e.type === 'PullRequestReviewEvent').length).catch(() => 0),
      // Repos created
      octokit.repos.listForUser({ username, type: 'owner', sort: 'created', per_page: 100 })
        .then(r => r.data.length).catch(() => 0),
      // Recent events for activity checks
      octokit.activity.listPublicEventsForUser({ username, per_page: 100 })
        .then(r => r.data).catch(() => []),
    ]);

    // Check for forked repos
    const forkedRepos = await octokit.repos.listForUser({ username, type: 'owner', per_page: 100 })
      .then(r => r.data.filter(repo => repo.fork).length).catch(() => 0);

    // Check for CONTRIBUTING.md reads (approximated by fork + activity in a repo)
    const hasForkedRepo = forkedRepos > 0;

    // Check issue comments (user commented on issues)
    const issueComments = (events as any[]).filter(e => e.type === 'IssueCommentEvent').length;

    // Push events (commits)
    const pushEvents = (events as any[]).filter(e => e.type === 'PushEvent').length;

    // PR comment responses (review comments)
    const prCommentEvents = (events as any[]).filter(e =>
      e.type === 'PullRequestReviewCommentEvent' || e.type === 'PullRequestReviewEvent'
    ).length;

    // Calculate streak from GraphQL
    let streak = 0;
    try {
      const gqlRes = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { 'Authorization': `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($username:String!){user(login:$username){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
          variables: { username },
        }),
      });
      const gql = await gqlRes.json();
      const weeks = gql?.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
      const days = weeks.flatMap((w: any) => w.contributionDays).reverse();
      for (const d of days) { if (d.contributionCount > 0) streak++; else break; }
    } catch { /* fallback */ }

    // Unique repos contributed to
    const reposContributed = new Set<string>();
    (events as any[]).forEach(e => {
      if (['PushEvent', 'PullRequestEvent', 'IssuesEvent'].includes(e.type || '')) {
        reposContributed.add(e.repo?.name || '');
      }
    });

    // Fetch recent PRs for detailed verification
    const recentPRs: Array<{ title: string; repo: string; merged: boolean; url: string; reviewComments: number }> = [];
    try {
      const { data } = await octokit.search.issuesAndPullRequests({
        q: `author:${username} is:pr sort:updated-desc`, per_page: 10,
      });
      for (const pr of data.items) {
        const repoMatch = pr.repository_url.match(/repos\/(.+)$/);
        recentPRs.push({
          title: pr.title,
          repo: repoMatch ? repoMatch[1] : '',
          merged: pr.pull_request?.merged_at != null,
          url: pr.html_url,
          reviewComments: pr.comments || 0,
        });
      }
    } catch { /* fallback */ }

    const verified = {
      prsRaised,
      prsMerged,
      starsGiven,
      issuesOpened,
      issuesClosed,
      prReviews,
      reposCreated,
      forkedRepos,
      hasForkedRepo,
      issueComments,
      pushEvents,
      prCommentEvents,
      streak,
      reposContributed: reposContributed.size,
      recentPRs,
      // Quest verification map — each quest maps to a verification function
      questStatus: generateQuestStatus(questPath, {
        prsRaised, prsMerged, starsGiven, issuesOpened, issuesClosed,
        prReviews, forkedRepos, issueComments, pushEvents, prCommentEvents,
        streak, reposContributed: reposContributed.size, recentPRs,
      }),
    };

    console.log(`[verify-quests] ${username}: ${prsMerged} merged, ${prsRaised} raised, ${streak} streak, ${reposContributed.size} repos`);

    return NextResponse.json(verified);
  } catch (error: any) {
    console.error('Quest verification failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

interface Stats {
  prsRaised: number; prsMerged: number; starsGiven: number;
  issuesOpened: number; issuesClosed: number; prReviews: number;
  forkedRepos: number; issueComments: number; pushEvents: number;
  prCommentEvents: number; streak: number; reposContributed: number;
  recentPRs: Array<{ title: string; repo: string; merged: boolean; url: string; reviewComments: number }>;
}

function generateQuestStatus(path: string, s: Stats): Record<string, boolean> {
  const q: Record<string, boolean> = {};

  if (path === 'first-pr') {
    // Stage 1: Scout
    q['1-0'] = s.starsGiven >= 3;                    // Star 3 repos
    q['1-1'] = true;                                   // Read CONTRIBUTING.md (can't verify, auto-pass)
    q['1-2'] = s.issueComments >= 1;                  // Comment on an issue
    q['1-3'] = s.forkedRepos >= 1;                    // Fork a repo
    // Stage 2: Builder
    q['2-0'] = s.pushEvents >= 1;                     // Create branch + push
    q['2-1'] = s.pushEvents >= 2;                     // Write code
    q['2-2'] = s.prsRaised >= 1;                      // Open first PR
    q['2-3'] = s.prCommentEvents >= 1;                // Respond to review
    // Stage 3: Streak
    q['3-0'] = s.prsMerged >= 1;                      // First PR merged
    q['3-1'] = s.issueComments >= 2;                  // Claim second issue
    q['3-2'] = s.prsRaised >= 2;                      // PR #2
    q['3-3'] = s.prsRaised >= 3;                      // PR #3
    // Stage 4: Contributor
    q['4-0'] = s.prReviews >= 1;                      // Review someone's PR
    q['4-1'] = s.prsRaised >= 4;                      // Docs improvement (approx)
    q['4-2'] = s.issueComments >= 3;                  // Help triage
    q['4-3'] = s.prsMerged >= 5;                      // 5 total merged
  } else if (path === 'bounties') {
    // Stage 1: Setup
    q['1-0'] = true;                                   // Browse issues
    q['1-1'] = true;                                   // Sign up on bounty platform
    q['1-2'] = s.issueComments >= 1;                  // Read bounty issues
    q['1-3'] = s.issueComments >= 2;                  // Claim bounty
    // Stage 2: First Bounty
    q['2-0'] = s.pushEvents >= 2;                     // Write solution
    q['2-1'] = s.prsRaised >= 1;                      // Submit PR
    q['2-2'] = s.prsRaised >= 1;                      // Pass CI
    q['2-3'] = s.prsMerged >= 1;                      // Get merged
    // Stage 3: Consistent
    q['3-0'] = s.prsMerged >= 2;
    q['3-1'] = s.prsMerged >= 3;
    q['3-2'] = s.prsMerged >= 3;                      // Earnings proxy
    q['3-3'] = s.reposContributed >= 2;               // Repeat bounty
  } else if (path === 'consistent') {
    // Stage 1: Habit
    q['1-0'] = true;                                   // Set goal
    q['1-1'] = true;                                   // Block time
    q['1-2'] = s.pushEvents >= 1;                     // First contribution
    q['1-3'] = s.pushEvents >= 2;                     // 2 in one week
    // Stage 2: 7-day
    q['2-0'] = s.streak >= 2;
    q['2-1'] = s.prsRaised >= 1;
    q['2-2'] = s.prReviews >= 1 || s.issueComments >= 1;
    q['2-3'] = s.streak >= 7;
    // Stage 3: 30-day
    q['3-0'] = s.pushEvents >= 5;
    q['3-1'] = s.prsRaised >= 2;
    q['3-2'] = s.issueComments >= 2;
    q['3-3'] = s.streak >= 30;
  }

  return q;
}
