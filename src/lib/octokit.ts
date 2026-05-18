import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function getRepoIssues(owner: string, repo: string) {
  try {
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 10,
      sort: "created",
      direction: "desc",
    });

    return issues.map(issue => ({
      title: issue.title,
      body: issue.body,
      url: issue.html_url,
      number: issue.number,
      labels: issue.labels.map((l: any) => l.name),
    }));
  } catch (error) {
    console.error("Error fetching issues:", error);
    return [];
  }
}

export async function getRepoDetails(owner: string, repo: string) {
  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });

    return {
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      topics: data.topics,
    };
  } catch (error) {
    console.error("Error fetching repo details:", error);
    return null;
  }
}
