const GITHUB_API_URL = 'https://api.github.com';
const ISSUES_PER_PAGE = 100; // GitHub's maximum page size
const MAX_ISSUE_PAGES = 10;
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
  token: string; // empty string means anonymous access
  signal?: AbortSignal;
};

function buildHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  // GitHub rejects an empty credential with 401, so only send it when present
  if (token) headers.Authorization = `token ${token}`;
  return headers;
}

// Checks every field the dashboard reads, so a malformed entry fails here instead of crashing the render
function isGitHubIssue(value: unknown): value is GitHubIssue {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'number' &&
    typeof entry.number === 'number' &&
    typeof entry.title === 'string' &&
    (entry.state === 'open' || entry.state === 'closed') &&
    Array.isArray(entry.labels) &&
    entry.labels.every((label) => typeof label === 'object' && label !== null && 'name' in label) &&
    typeof entry.created_at === 'string' &&
    typeof entry.updated_at === 'string'
  );
}

function isGitHubIssueArray(value: unknown): value is GitHubIssue[] {
  return Array.isArray(value) && value.every(isGitHubIssue);
}

export function buildIssuesUrl(params: { owner: string; repo: string; page: number }): string {
  const url = new URL(`${GITHUB_API_URL}/repos/${params.owner}/${params.repo}/issues`);
  // The endpoint defaults to open issues only; the dashboard shows both states
  url.searchParams.set('state', 'all');
  url.searchParams.set('page', String(params.page));
  url.searchParams.set('per_page', String(ISSUES_PER_PAGE));
  return url.toString();
}

export async function fetchIssues(
  params: RepoParams & { page: number },
): Promise<{ issues: GitHubIssue[]; isLastPage: boolean }> {
  const response = await fetch(buildIssuesUrl(params), {
    headers: buildHeaders(params.token),
    signal: params.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load issues (status ${response.status})`);
  }
  const entries: unknown = await response.json();
  if (!isGitHubIssueArray(entries)) {
    throw new Error('Unexpected response from the GitHub issues endpoint');
  }
  return {
    // The /issues endpoint also returns pull requests
    issues: entries.filter((entry) => !entry.pull_request),
    // The Link header is authoritative: a full page can still be the last one
    isLastPage: !response.headers.get('Link')?.includes('rel="next"'),
  };
}

export async function fetchAllIssues(params: RepoParams): Promise<{ issues: GitHubIssue[]; isTruncated: boolean }> {
  const allIssues: GitHubIssue[] = [];
  for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
    const { issues, isLastPage } = await fetchIssues({ ...params, page });
    allIssues.push(...issues);
    if (isLastPage) return { issues: allIssues, isTruncated: false };
  }
  // Stopped at MAX_ISSUE_PAGES with more pages left
  return { issues: allIssues, isTruncated: true };
}

export function getLabelsText(issue: Pick<GitHubIssue, 'labels'>): string {
  return issue.labels.map((label) => label.name).join(', ');
}

export function isStale(issue: Pick<GitHubIssue, 'updated_at'>): boolean {
  return Date.now() - new Date(issue.updated_at).getTime() > STALE_AFTER_MS;
}

// Newest first, matching GitHub's own issue list
export function sortByDate<T extends Pick<GitHubIssue, 'created_at'>>(issues: T[]): T[] {
  return [...issues].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
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
