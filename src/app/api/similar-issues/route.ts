import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get('repo'); // owner/repo format
    const issueTitle = searchParams.get('title');

    if (!repo || !issueTitle) {
      return NextResponse.json({ error: 'repo and title are required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Search for closed issues/PRs with similar keywords
    const keywords = issueTitle
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 4)
      .join(' ');

    const query = `repo:${owner}/${repoName} ${keywords} is:closed is:issue`;

    const { data } = await octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 5,
    });

    const similar = data.items.map(item => ({
      title: item.title,
      number: item.number,
      url: item.html_url,
      closedAt: item.closed_at,
      isPR: !!item.pull_request,
      labels: item.labels.map((l: any) => typeof l === 'string' ? l : l.name || ''),
    }));

    return NextResponse.json({ similar });
  } catch (error: any) {
    console.error('Similar issues search failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
