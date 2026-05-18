import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1. User profile
    const { data: user } = await octokit.users.getByUsername({ username });

    // 2. Repos
    const { data: repos } = await octokit.repos.listForUser({
      username, sort: 'pushed', per_page: 100, type: 'owner',
    });

    // 3. Language stats with proficiency estimation
    const langStats: Record<string, { repoCount: number; totalSize: number }> = {};
    for (const repo of repos) {
      if (repo.language) {
        if (!langStats[repo.language]) langStats[repo.language] = { repoCount: 0, totalSize: 0 };
        langStats[repo.language].repoCount += 1;
        langStats[repo.language].totalSize += repo.size || 0;
      }
    }
    const languages = Object.entries(langStats)
      .sort((a, b) => b[1].repoCount - a[1].repoCount)
      .slice(0, 8)
      .map(([lang, stats]) => ({
        language: lang,
        repoCount: stats.repoCount,
        proficiency: stats.repoCount >= 10 ? 'Advanced' : stats.repoCount >= 4 ? 'Intermediate' : 'Beginner',
        percentage: Math.round((stats.repoCount / repos.length) * 100),
      }));

    // 4. Fetch user's PRs — raised and merged
    let prsMerged = 0;
    let prsRaised = 0;
    let reposContributed = new Set<string>();
    try {
      // PRs merged
      const { data: mergedData } = await octokit.search.issuesAndPullRequests({
        q: `author:${username} is:pr is:merged`,
        sort: 'updated', order: 'desc', per_page: 100,
      });
      prsMerged = mergedData.total_count;
      mergedData.items.forEach((pr: any) => {
        const m = pr.repository_url.match(/repos\/(.+)$/);
        if (m) reposContributed.add(m[1]);
      });

      // PRs raised (all PRs authored — open + closed)
      const { data: raisedData } = await octokit.search.issuesAndPullRequests({
        q: `author:${username} is:pr`,
        sort: 'updated', order: 'desc', per_page: 1,
      });
      prsRaised = raisedData.total_count;
    } catch (err) { console.error('PR fetch error:', err); }

    // 5. Fetch issues closed by user
    let issuesSolved = 0;
    try {
      const { data: issueData } = await octokit.search.issuesAndPullRequests({
        q: `author:${username} is:issue is:closed`,
        sort: 'updated', order: 'desc', per_page: 1,
      });
      issuesSolved = issueData.total_count;
    } catch { /* fallback */ }

    // 6. Contribution heatmap via GitHub GraphQL API (accurate data)
    const contributionDays: Record<string, number> = {};
    let totalContributions = 0;
    try {
      const graphqlQuery = `
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
      `;
      const gqlRes = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: graphqlQuery, variables: { username } }),
      });
      const gqlData = await gqlRes.json();
      const calendar = gqlData?.data?.user?.contributionsCollection?.contributionCalendar;
      if (calendar) {
        totalContributions = calendar.totalContributions;
        for (const week of calendar.weeks) {
          for (const day of week.contributionDays) {
            contributionDays[day.date] = day.contributionCount;
          }
        }
        console.log(`[profile-stats] GraphQL heatmap: ${totalContributions} total contributions for ${username}`);
      }
    } catch (err) {
      console.error('[profile-stats] GraphQL heatmap failed, falling back to Events API:', err);
      // Fallback: use Events API
      try {
        for (let page = 1; page <= 3; page++) {
          const { data: events } = await octokit.activity.listPublicEventsForUser({
            username, per_page: 100, page,
          });
          if (events.length === 0) break;
          for (const event of events) {
            const day = (event.created_at || '').split('T')[0];
            if (!day) continue;
            contributionDays[day] = (contributionDays[day] || 0) + 1;
          }
        }
      } catch { /* silent */ }
    }

    // Fill 12 months of data
    const heatmap: Array<{ date: string; count: number }> = [];
    const now = new Date();
    for (let i = 365; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      heatmap.push({ date: key, count: contributionDays[key] || 0 });
    }

    // 7. Recent contributions for timeline — broad capture
    const recentContributions: Array<{ type: string; repo: string; title: string; date: string; url: string }> = [];
    try {
      const { data: events } = await octokit.activity.listPublicEventsForUser({
        username, per_page: 100,
      });
      console.log(`[profile-stats] Fetched ${events.length} events for ${username}`);
      for (const event of events) {
        if (recentContributions.length >= 20) break;
        const repo = (event.repo as any)?.name || '';
        const date = event.created_at || '';
        const payload = event.payload as any;

        if (event.type === 'PullRequestEvent') {
          const pr = payload?.pull_request;
          if (!pr) continue;
          if (payload?.action === 'opened') {
            recentContributions.push({ type: 'pr_opened', repo, title: pr.title, date, url: pr.html_url });
          } else if (payload?.action === 'closed' && pr.merged) {
            recentContributions.push({ type: 'pr_merged', repo, title: pr.title, date, url: pr.html_url });
          }
        } else if (event.type === 'PushEvent') {
          const commits = payload?.commits || [];
          if (commits.length > 0) {
            recentContributions.push({ type: 'push', repo, title: `${commits.length} commit${commits.length > 1 ? 's' : ''} pushed`, date, url: `https://github.com/${repo}` });
          }
        } else if (event.type === 'IssuesEvent') {
          const issue = payload?.issue;
          if (!issue) continue;
          if (payload?.action === 'opened') {
            recentContributions.push({ type: 'issue_opened', repo, title: issue.title, date, url: issue.html_url });
          } else if (payload?.action === 'closed') {
            recentContributions.push({ type: 'issue_closed', repo, title: issue.title, date, url: issue.html_url });
          }
        } else if (event.type === 'CreateEvent') {
          const refType = payload?.ref_type;
          if (refType === 'repository') {
            recentContributions.push({ type: 'repo_created', repo, title: `Created repository`, date, url: `https://github.com/${repo}` });
          } else if (refType === 'branch') {
            recentContributions.push({ type: 'branch_created', repo, title: `Created branch ${payload?.ref || ''}`, date, url: `https://github.com/${repo}` });
          }
        } else if (event.type === 'WatchEvent') {
          recentContributions.push({ type: 'starred', repo, title: `Starred ${repo}`, date, url: `https://github.com/${repo}` });
        } else if (event.type === 'ForkEvent') {
          recentContributions.push({ type: 'forked', repo, title: `Forked ${repo}`, date, url: payload?.forkee?.html_url || `https://github.com/${repo}` });
        } else if (event.type === 'IssueCommentEvent') {
          const issue = payload?.issue;
          if (issue) {
            recentContributions.push({ type: 'comment', repo, title: `Commented on: ${issue.title}`, date, url: payload?.comment?.html_url || issue.html_url });
          }
        } else if (event.type === 'PullRequestReviewEvent') {
          const pr = payload?.pull_request;
          if (pr) {
            recentContributions.push({ type: 'pr_review', repo, title: `Reviewed: ${pr.title}`, date, url: pr.html_url });
          }
        }
      }
    } catch (err) { console.error('[profile-stats] Events fetch error:', err); }

    // 8. Streak calculation from heatmap
    let streak = 0;
    for (let i = heatmap.length - 1; i >= 0; i--) {
      if (heatmap[i].count > 0) streak++;
      else break;
    }

    // 9. Auto-generate tagline
    const primaryLang = languages[0]?.language || 'Code';
    const tagline = `${primaryLang} developer · ${prsRaised} PRs raised · ${prsMerged} merged · Active contributor`;

    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);

    console.log(`[profile-stats] ${username}: ${prsRaised} raised, ${prsMerged} merged, ${recentContributions.length} activities`);

    return NextResponse.json({
      username: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url,
      bio: user.bio || '',
      location: user.location || '',
      company: user.company || '',
      blog: user.blog || '',
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      tagline,
      stats: {
        issuesSolved,
        prsRaised,
        prsMerged,
        reposContributed: reposContributed.size,
        totalBounties: 0,
        streak,
        totalStars,
      },
      languages,
      heatmap,
      recentContributions: recentContributions.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Profile stats failed:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
