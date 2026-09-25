import React from 'react'
import { Link, useLoaderData } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getReposByOwner } from './utils/github'

const fetchIssues = async ({ queryKey }: any) => {
  const [_key, owner, repo, providerToken] = queryKey
  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    headers: providerToken ? { Authorization: `token ${providerToken}` } : undefined,
  })
  if (!resp.ok) throw new Error(`GitHub API returned ${resp.status}`)
  const data = await resp.json()
  return (data || []).filter((it: any) => !it.pull_request)
}
export const getReposForMejat = async ({ queryKey }: any) => {
  const [_key, owner = 'mejat9806', providerToken] = queryKey
  return getReposByOwner(owner, providerToken ?? undefined)
}
const ViewIssues = ({ providerToken }: { providerToken?: string | null }) => {
  const [owner, setOwner] = React.useState('mejat9806')
  const [repo, setRepo] = React.useState('start-coolify')

  const reposQuery = useQuery({
    queryKey: ['repos', owner, providerToken],
    queryFn: getReposForMejat,
    enabled: true,
    retry: false,
  })

  const query = useQuery({
    queryKey: ['issues', owner, repo, providerToken],
    queryFn: fetchIssues,
    enabled: true,
    retry: false,
  })
  const data = useLoaderData({ from: '/view-issues' })

  console.log('Loader data for view-issues:', data)
  const issues = query.data || []
  return (
    <div className="max-w-3xl mx-auto my-6 bg-white p-6 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">View Issues</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <input value={owner} onChange={(e) => setOwner(e.target.value)} className="px-3 py-2 border rounded" />
        {reposQuery.isLoading ? (
          <div className="px-3 py-2">Loading repos...</div>
        ) : reposQuery.isError ? (
          <div className="px-3 py-2 text-red-500">Failed to load repos</div>
        ) : (
          <select value={repo} onChange={(e) => setRepo(e.target.value)} className="px-3 py-2 border rounded">
            {(reposQuery.data?.repos ?? []).map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        )}
      </div>


      {query.isLoading && <p>Loading...</p>}
      {query.isError && <p className="text-red-500">{(query.error as Error).message}</p>}
      {reposQuery.isError && <p className="text-red-500">Failed to load repositories: {reposQuery.error.message}</p>}
      {reposQuery.data?.isTruncated && <p className="text-slate-500 text-sm">Showing the 1,000 most recently updated repositories.</p>}

      <ul className="space-y-3">
        {(issues || []).map((iss: any) => (
          <li key={iss.id} className="p-3 border rounded">
            <Link to={`/issue/${owner}/${repo}/${iss.number}`} className="font-medium text-indigo-600 block">
              {iss.title}
            </Link>
            <p className="text-sm text-slate-600">#{iss.number} • {iss.user?.login}</p>
          </li>
        ))}
      </ul>

    </div>
  )
}

export default ViewIssues
