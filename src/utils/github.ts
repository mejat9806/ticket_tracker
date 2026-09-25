const GITHUB_API_URL = 'https://api.github.com';
const REPOS_PER_PAGE = 100; // GitHub's maximum page size
const MAX_REPO_PAGES = 10;

export type GitHubRepo = {
  id: number;
  name: string;
  private: boolean;
};

async function getAuthenticatedLogin(
  headers: HeadersInit,
): Promise<string | null> {
  const response = await fetch(`${GITHUB_API_URL}/user`, { headers });
  if (!response.ok) return null;
  const user = (await response.json()) as { login: string };
  return user.login;
}

export async function getReposByOwner(
  owner: string,
  token?: string,
): Promise<GitHubRepo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (token) headers.Authorization = `token ${token}`;

  // /users/{owner}/repos only lists public repos; /user/repos also includes the signed-in user's private ones
  const login = token ? await getAuthenticatedLogin(headers) : null;
  const isOwnAccount = login?.toLowerCase() === owner.toLowerCase();
  const reposUrl = isOwnAccount
    ? `${GITHUB_API_URL}/user/repos`
    : `${GITHUB_API_URL}/users/${owner}/repos`;

  const allRepos: GitHubRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const url = new URL(reposUrl);
    url.searchParams.set('per_page', String(REPOS_PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'updated');
    if (isOwnAccount) url.searchParams.set('affiliation', 'owner');

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to load repositories (status ${response.status})`,
      );
    }
    const repos = (await response.json()) as GitHubRepo[];
    allRepos.push(...repos);
    if (repos.length < REPOS_PER_PAGE) break;
  }
  return allRepos;
}

export type SavedFilter = { owner: string; repo: string; state: string };

export function loadSavedFilter(): SavedFilter {
  const raw = localStorage.getItem('issue-filter');
  return JSON.parse(raw ?? '{}');
}

export async function getIssueCount(params: {
  owner: string;
  repo: string;
  closed: string;
}) {
  const req = new URLSearchParams();
  if (params.closed) req.set('state', 'closed');
  try {
    const res = await fetch(
      `https://api.github.com/repos/${params.owner}/${params.repo}/issues?` +
        req.toString(),
    );
    const json = await res.json();
    return json.length as number;
  } catch (err: any) {
    throw 'Could not load issues: ' + err.message;
  }
}

export default getReposByOwner;
