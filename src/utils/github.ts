export async function getReposByOwner(owner: string, token?: string) {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
    }
    if (token) headers.Authorization = `token ${token}`

    try {
        const resp = await fetch(`https://api.github.com/users/${owner}/repos`, {
            headers,
        })
        if (!resp.ok) return []
        return resp.json()
    } catch (err) {
        return []
    }
}

export default getReposByOwner
