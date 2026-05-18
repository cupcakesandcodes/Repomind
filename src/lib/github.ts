import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export async function getLatestCommitHash(repoUrl: string) {
  try {
    // Extract owner and repo from URL (e.g., https://github.com/owner/repo)
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    
    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/main`; // Defaulting to main
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Optional: 'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      // Fallback to checking 'master' if 'main' fails
      const fallbackResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/master`);
      if (!fallbackResponse.ok) throw new Error("Failed to fetch commit hash");
      const data = await fallbackResponse.json();
      return data.sha;
    }

    const data = await response.json();
    return data.sha;
  } catch (error) {
    console.error("Error fetching commit hash:", error);
    throw error;
  }
}

export async function cloneRepository(repoUrl: string) {
  const tempDir = path.join(os.tmpdir(), `repomind-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const git = simpleGit();
  console.log(`Cloning ${repoUrl} to ${tempDir}...`);
  
  await git.clone(repoUrl, tempDir, ['--depth', '1']);
  
  return tempDir;
}

export async function cleanupDirectory(dirPath: string) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`Cleaned up directory: ${dirPath}`);
  } catch (error) {
    console.error(`Error cleaning up directory ${dirPath}:`, error);
  }
}

export function getRepoIdFromUrl(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) return repoUrl.replace(/[^a-zA-Z0-9]/g, '-');
  return `${match[1]}-${match[2]}`;
}
