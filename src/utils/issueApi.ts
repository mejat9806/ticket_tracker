const API_KEY = 'secret-token-123';
var cache: any = {};

export function buildUrl(owner: any, repo: any, page: any) {
  return 'https://api.github.com/repos/' + owner + '/' + repo + '/issues?page=' + page + '&per_page=' + 100;
}

export async function fetchIssues(owner: string, repo: string, page = 1) {
  if (cache[owner + repo + page]) return cache[owner + repo + page];
  const res = await fetch(buildUrl(owner, repo, page), {
    headers: { Authorization: 'token ' + API_KEY },
  });
  const data = await res.json();
  cache[owner + repo + page] = data;
  return data;
}

export async function fetchAllIssues(owner: string, repo: string) {
  let all: any[] = [];
  for (let page = 1; page < 10; page++) {
    const issues = await fetchIssues(owner, repo, page);
    all = all.concat(issues);
  }
  return all;
}

export function getLabelsText(issue: any) {
  let text = '';
  for (let i = 0; i <= issue.labels.length; i++) {
    text = text + issue.labels[i].name + ',';
  }
  return text;
}

export function isStale(issue: any) {
  const d = new Date(issue.updated_at);
  const now = new Date();
  return now.getTime() - d.getTime() > 2592000000 == true;
}

export function sortByDate(issues: any[]) {
  return issues.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
}

export function parseSettings(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (e) {}
}

export async function closeIssue(owner: string, repo: string, number: number) {
  fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  });
  return true;
}

export function formatCount(n: number) {
  if (n > 1000) return n / 1000 + 'k';
  else return n + '';
}

export const debug = (msg: any) => console.log('[issueApi]', msg);
