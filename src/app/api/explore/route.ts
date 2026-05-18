import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface TrendingRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  owner: {
    login: string;
    avatar: string;
  };
  updatedAt: string;
  openIssuesCount: number;
}

interface TopContributor {
  login: string;
  avatar: string;
  contributions: number;
  url: string;
  repos: string[];
}

const INTEREST_CATEGORIES: Record<string, { query: string; emoji: string; description: string }> = {
  'Web Dev': { query: 'topic:web stars:>500', emoji: '🌐', description: 'Frontend, backend, fullstack' },
  'AI / ML': { query: 'topic:machine-learning stars:>500', emoji: '🤖', description: 'Models, training, inference' },
  'DevOps': { query: 'topic:devops stars:>300', emoji: '⚙️', description: 'CI/CD, containers, infra' },
  'Mobile': { query: 'topic:mobile stars:>300', emoji: '📱', description: 'iOS, Android, cross-platform' },
  'Security': { query: 'topic:security stars:>300', emoji: '🔒', description: 'AppSec, cryptography, tooling' },
  'Data': { query: 'topic:data-science stars:>300', emoji: '📊', description: 'Analytics, pipelines, viz' },
  'Game Dev': { query: 'topic:game-development stars:>200', emoji: '🎮', description: 'Engines, assets, tools' },
  'Blockchain': { query: 'topic:blockchain stars:>200', emoji: '⛓️', description: 'Smart contracts, DeFi, Web3' },
  'CLI Tools': { query: 'topic:cli stars:>500', emoji: '💻', description: 'Terminal tools and utilities' },
  'Design': { query: 'topic:design stars:>200', emoji: '🎨', description: 'UI libraries, design systems' },
};

export async function POST(req: NextRequest) {
  try {
    const { interests, primaryStack, category } = await req.json();
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Build the query based on the request
    let searchQuery = '';
    if (category && INTEREST_CATEGORIES[category]) {
      searchQuery = INTEREST_CATEGORIES[category].query;
    } else if (primaryStack && primaryStack.length > 0) {
      const lang = primaryStack[0];
      searchQuery = `language:${lang} stars:>100 pushed:>${getDateNDaysAgo(90)}`;
    } else {
      searchQuery = 'stars:>1000 pushed:>' + getDateNDaysAgo(30);
    }

    // Fetch trending repos
    const sortOptions = ['stars', 'updated'] as const;
    const sort = sortOptions[Math.floor(Math.random() * sortOptions.length)];

    const { data: repoResults } = await octokit.search.repos({
      q: searchQuery,
      sort,
      order: 'desc',
      per_page: 20,
      page: Math.floor(Math.random() * 3) + 1,
    });

    const trendingRepos: TrendingRepo[] = repoResults.items.map((repo: any) => ({
      id: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || 'Unknown',
      topics: repo.topics || [],
      owner: {
        login: repo.owner.login,
        avatar: repo.owner.avatar_url,
      },
      updatedAt: repo.updated_at,
      openIssuesCount: repo.open_issues_count,
    }));

    // Fetch good-first-issues for these repos (for "Level Up" section)
    const goodFirstIssueQuery = primaryStack && primaryStack.length > 0
      ? `language:${primaryStack[0]} label:"good first issue" state:open stars:>50`
      : 'label:"good first issue" state:open stars:>500';

    const { data: gfiResults } = await octokit.search.issuesAndPullRequests({
      q: goodFirstIssueQuery,
      sort: 'created',
      order: 'desc',
      per_page: 8,
    });

    const levelUpIssues = gfiResults.items
      .filter((item: any) => !item.pull_request)
      .slice(0, 6)
      .map((issue: any) => {
        const repoMatch = issue.repository_url.match(/repos\/(.+)$/);
        const repoFullName = repoMatch ? repoMatch[1] : 'unknown/unknown';
        return {
          id: String(issue.id),
          title: issue.title,
          repo: repoFullName,
          url: issue.html_url,
          labels: issue.labels.map((l: any) => typeof l === 'string' ? l : l.name || ''),
          comments: issue.comments,
          createdAt: issue.created_at,
        };
      });

    // Fetch top contributors from a selection of trending repos
    const topContributors: TopContributor[] = [];
    const contributorSeen = new Set<string>();
    
    for (const repo of trendingRepos.slice(0, 5)) {
      try {
        const [owner, repoName] = repo.fullName.split('/');
        const { data: contributors } = await octokit.repos.listContributors({
          owner,
          repo: repoName,
          per_page: 5,
        });

        for (const contrib of contributors) {
          if (!contrib.login || contributorSeen.has(contrib.login) || contrib.type === 'Bot') continue;
          contributorSeen.add(contrib.login);
          
          const existing = topContributors.find(c => c.login === contrib.login);
          if (existing) {
            existing.contributions += contrib.contributions;
            existing.repos.push(repo.name);
          } else {
            topContributors.push({
              login: contrib.login,
              avatar: contrib.avatar_url || '',
              contributions: contrib.contributions,
              url: `https://github.com/${contrib.login}`,
              repos: [repo.name],
            });
          }
        }
      } catch {
        // Skip repos with errors
      }
    }

    topContributors.sort((a, b) => b.contributions - a.contributions);

    // Fetch recently active issues across interesting repos
    const recentIssueQuery = primaryStack && primaryStack.length > 0
      ? `language:${primaryStack[0]} state:open label:"help wanted" stars:>100`
      : 'state:open label:"help wanted" stars:>1000';

    const { data: recentIssues } = await octokit.search.issuesAndPullRequests({
      q: recentIssueQuery,
      sort: 'updated',
      order: 'desc',
      per_page: 10,
    });

    const helpWantedIssues = recentIssues.items
      .filter((item: any) => !item.pull_request)
      .slice(0, 8)
      .map((issue: any) => {
        const repoMatch = issue.repository_url.match(/repos\/(.+)$/);
        const repoFullName = repoMatch ? repoMatch[1] : 'unknown/unknown';
        return {
          id: String(issue.id),
          title: issue.title,
          repo: repoFullName,
          url: issue.html_url,
          labels: issue.labels.map((l: any) => typeof l === 'string' ? l : l.name || ''),
          comments: issue.comments,
          createdAt: issue.created_at,
        };
      });

    return NextResponse.json({
      trendingRepos,
      topContributors: topContributors.slice(0, 12),
      levelUpIssues,
      helpWantedIssues,
      categories: Object.entries(INTEREST_CATEGORIES).map(([name, cat]) => ({
        name,
        emoji: cat.emoji,
        description: cat.description,
      })),
    });
  } catch (error: any) {
    console.error('Explore failed:', error);
    return NextResponse.json({ error: error.message || 'Explore failed' }, { status: 500 });
  }
}

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
