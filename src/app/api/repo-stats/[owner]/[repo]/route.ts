import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface RepoStats {
  // Maintainer Responsiveness
  avgMergeTimeDays: number | null;
  responsiveness: 'Fast' | 'Moderate' | 'Slow' | 'Unknown';
  recentMerges: number;

  // Repo Momentum
  momentum: 'Growing' | 'Stable' | 'Declining' | 'Unknown';
  starsCount: number;
  forksCount: number;
  recentCommits: number; // commits in last 30 days
  lastRelease: string | null;
  openIssues: number;

  // Competition for a specific issue
  issuePRCount?: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(req.url);
    const issueNumber = searchParams.get('issue');

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Run all fetches in parallel
    const [repoData, pullsData, commitsData, releasesData, competitionData] = await Promise.allSettled([
      // 1. Repo info
      octokit.repos.get({ owner, repo }),

      // 2. Recently merged PRs (for responsiveness)
      octokit.pulls.list({
        owner, repo,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 30,
      }),

      // 3. Recent commits (for momentum)
      octokit.repos.getCommitActivityStats({ owner, repo }),

      // 4. Latest release
      octokit.repos.listReleases({ owner, repo, per_page: 1 }),

      // 5. Competition score for specific issue (if provided)
      issueNumber 
        ? octokit.search.issuesAndPullRequests({
            q: `repo:${owner}/${repo} is:pr is:open ${issueNumber}`,
            per_page: 1
          })
        : Promise.resolve(null)
    ]);

    // ── Parse repo data ──
    let starsCount = 0;
    let forksCount = 0;
    let openIssues = 0;

    if (repoData.status === 'fulfilled') {
      starsCount = repoData.value.data.stargazers_count;
      forksCount = repoData.value.data.forks_count;
      openIssues = repoData.value.data.open_issues_count;
    }

    // ── Maintainer Responsiveness ──
    let avgMergeTimeDays: number | null = null;
    let responsiveness: RepoStats['responsiveness'] = 'Unknown';
    let recentMerges = 0;

    if (pullsData.status === 'fulfilled') {
      const mergedPRs = pullsData.value.data.filter(pr => pr.merged_at);
      recentMerges = mergedPRs.length;

      if (mergedPRs.length > 0) {
        const mergeTimes = mergedPRs.map(pr => {
          const created = new Date(pr.created_at).getTime();
          const merged = new Date(pr.merged_at!).getTime();
          return (merged - created) / (1000 * 60 * 60 * 24); // days
        });

        avgMergeTimeDays = Math.round(
          mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length
        );

        if (avgMergeTimeDays <= 3) responsiveness = 'Fast';
        else if (avgMergeTimeDays <= 10) responsiveness = 'Moderate';
        else responsiveness = 'Slow';
      }
    }

    // ── Repo Momentum ──
    let recentCommits = 0;
    let momentum: RepoStats['momentum'] = 'Unknown';

    if (commitsData.status === 'fulfilled' && Array.isArray(commitsData.value.data)) {
      const weeks = commitsData.value.data;
      // Last 4 weeks
      const last4 = weeks.slice(-4);
      const prev4 = weeks.slice(-8, -4);

      const recentTotal = last4.reduce((sum, w: any) => sum + (w.total || 0), 0);
      const prevTotal = prev4.reduce((sum, w: any) => sum + (w.total || 0), 0);

      recentCommits = recentTotal;

      if (prevTotal === 0 && recentTotal > 0) {
        momentum = 'Growing';
      } else if (prevTotal > 0) {
        const ratio = recentTotal / prevTotal;
        if (ratio > 1.1) momentum = 'Growing';
        else if (ratio > 0.9) momentum = 'Stable';
        else momentum = 'Declining';
      }
    }

    // ── Competition Score ──
    let issuePRCount = 0;
    if (competitionData && competitionData.status === 'fulfilled' && competitionData.value) {
      issuePRCount = (competitionData.value as any).data.total_count;
    }

    // ── Last Release ──
    let lastRelease: string | null = null;
    if (releasesData.status === 'fulfilled' && releasesData.value.data.length > 0) {
      lastRelease = releasesData.value.data[0].published_at || releasesData.value.data[0].created_at;
    }

    const stats: RepoStats = {
      avgMergeTimeDays,
      responsiveness,
      recentMerges,
      momentum,
      starsCount,
      forksCount,
      recentCommits,
      lastRelease,
      openIssues,
      issuePRCount,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Repo stats failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch repo stats' }, { status: 500 });
  }
}
