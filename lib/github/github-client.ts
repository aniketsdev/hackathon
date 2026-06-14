export async function postGitHubPrComment(params: {
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
  token: string;
}) {
  const response = await fetch(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body: params.body })
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
