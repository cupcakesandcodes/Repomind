const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function githubHeaders() {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  return headers;
}

export async function getLatestCommitHash(repoUrl: string): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo] = match;

  for (const branch of ['main', 'master']) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
      { headers: githubHeaders() }
    );
    if (res.ok) {
      const data = await res.json();
      return data.sha;
    }
  }
  throw new Error('Could not fetch latest commit hash');
}

export interface TreeFile {
  path: string;
  sha: string;
  size: number;
}

const SUPPORTED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.java', '.cpp', '.c', '.h',
  '.rb', '.php', '.rs', '.swift', '.kt',
  '.md', '.mdx',
];

/** Returns the list of all source files in the repo using the Git Trees API. */
export async function getRepoFileTree(owner: string, repo: string, sha: string): Promise<TreeFile[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    { headers: githubHeaders() }
  );
  if (!res.ok) throw new Error(`Failed to fetch file tree: ${res.statusText}`);
  const data = await res.json();

  if (data.truncated) {
    console.warn('GitHub tree response was truncated — repo may be very large.');
  }

  return (data.tree as any[]).filter((item: any) => {
    if (item.type !== 'blob') return false;
    // Skip node_modules, .git, dist, build, .next, vendor, __pycache__
    if (/^(node_modules|\.git|dist|build|\.next|vendor|__pycache__)\//.test(item.path)) return false;
    const ext = item.path.slice(item.path.lastIndexOf('.'));
    return SUPPORTED_EXTENSIONS.includes(ext);
  }).map((item: any) => ({
    path: item.path,
    sha: item.sha,
    size: item.size,
  }));
}

/** Fetches the decoded text content of a single file via GitHub API. */
export async function getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      { headers: githubHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.encoding !== 'base64' || !data.content) return null;
    // GitHub returns base64 with newlines — strip them first
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

export function getRepoIdFromUrl(repoUrl: string): string {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) return repoUrl.replace(/[^a-zA-Z0-9]/g, '-');
  return `${match[1]}-${match[2]}`;
}

export function parseOwnerRepo(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2] };
}
