const GITHUB_API_URL = 'https://api.github.com';
const ISSUES_PER_PAGE = 100; // GitHub's maximum page size
const MAX_ISSUE_PAGES = 10;
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const THOUSAND = 1000;

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: { name: string }[];
  assignee: { login: string } | null;
  created_at: string;
  updated_at: string;
  body: string | null;
  pull_request?: unknown; // present when the entry is a pull request
};

export type RepoParams = {
  owner: string;
  repo: string;
  token: string;
};

function buildHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `token ${token}`,
  };
}

export function buildIssuesUrl(params: { owner: string; repo: string; page: number }): string {
  const url = new URL(`${GITHUB_API_URL}/repos/${params.owner}/${params.repo}/issues`);
  url.searchParams.set('page', String(params.page));
  url.searchParams.set('per_page', String(ISSUES_PER_PAGE));
  return url.toString();
}

export async function fetchIssues(params: RepoParams & { page: number }): Promise<GitHubIssue[]> {
  const response = await fetch(buildIssuesUrl(params), { headers: buildHeaders(params.token) });
  if (!response.ok) {
    throw new Error(`Failed to load issues (status ${response.status})`);
  }
  const issues = (await response.json()) as GitHubIssue[];
  // The /issues endpoint also returns pull requests
  return issues.filter((issue) => !issue.pull_request);
}

export async function fetchAllIssues(params: RepoParams): Promise<GitHubIssue[]> {
  const allIssues: GitHubIssue[] = [];
  for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
    const issues = await fetchIssues({ ...params, page });
    if (issues.length === 0) break;
    allIssues.push(...issues);
  }
  return allIssues;
}

export function getLabelsText(issue: Pick<GitHubIssue, 'labels'>): string {
  return issue.labels.map((label) => label.name).join(', ');
}

export function isStale(issue: Pick<GitHubIssue, 'updated_at'>): boolean {
  return Date.now() - new Date(issue.updated_at).getTime() > STALE_AFTER_MS;
}

export function sortByDate<T extends Pick<GitHubIssue, 'created_at'>>(issues: T[]): T[] {
  return [...issues].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function parseSettings(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function closeIssue(params: RepoParams & { issueNumber: number }): Promise<void> {
  const response = await fetch(`${GITHUB_API_URL}/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}`, {
    method: 'PATCH',
    headers: { ...buildHeaders(params.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to close issue #${params.issueNumber} (status ${response.status})`);
  }
}

export function formatCount(count: number): string {
  if (count > THOUSAND) return `${count / THOUSAND}k`;
  return String(count);
}
