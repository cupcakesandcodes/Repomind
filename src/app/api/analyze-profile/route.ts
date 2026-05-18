import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1. Fetch user profile
    const { data: user } = await octokit.users.getByUsername({ username });

    // 2. Fetch repos (sorted by recently pushed)
    const { data: repos } = await octokit.repos.listForUser({
      username,
      sort: 'pushed',
      per_page: 100,
      type: 'owner',
    });

    // 3. Extract language stats
    const langCounts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    }

    // Sort by frequency
    const languages = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ language: lang, repoCount: count }));

    // 4. Extract topics across all repos
    const topicCounts: Record<string, number> = {};
    for (const repo of repos) {
      for (const topic of (repo.topics || [])) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }
    const topics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([topic]) => topic);

    // 5. Compute profile summary
    const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    const totalForks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
    const primaryStack = languages.slice(0, 5).map(l => l.language);

    // 6. Recent activity (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentRepos = repos.filter(r => new Date(r.pushed_at || '') > ninetyDaysAgo);

    const profile = {
      username: user.login,
      name: user.name,
      avatar: user.avatar_url,
      bio: user.bio,
      publicRepos: user.public_repos,
      followers: user.followers,
      totalStars,
      totalForks,
      primaryStack,
      languages,
      topics,
      recentActivity: recentRepos.length,
      topRepos: repos.slice(0, 6).map(r => ({
        name: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        url: r.html_url,
      })),
    };

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Profile analysis failed:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
