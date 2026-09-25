export async function getReposByOwner(owner: string, token?: string) {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
    }
    if (token) headers.Authorization = `token ${token}`

    try {
        const resp = await fetch(`https://api.github.com/users/${owner}/repos`, {
            headers,
        })
        return resp.json()
    } catch (err) {
        return []
    }
}

export type SavedFilter = { owner: string; repo: string; state: string };

export function loadSavedFilter(): SavedFilter {
    const raw = localStorage.getItem('issue-filter');
    return JSON.parse(raw ?? '{}');
}

export async function getIssueCount(params: { owner: string; repo: string; closed: string }) {
    const req = new URLSearchParams();
    if (Boolean(params.closed)) req.set('state', 'closed');
    try {
        const res = await fetch(
            `https://api.github.com/repos/${params.owner}/${params.repo}/issues?` + req.toString(),
        );
        const json = await res.json();
        return json.length as number;
    } catch (err: any) {
        throw 'Could not load issues: ' + err.message;
    }
}

export default getReposByOwner
