import React, { useEffect, useState } from 'react'
import { getRepoStats, getTopContributors, isActive, formatStars, starRepo, daysSincePush, RepoStatsInfo } from '../utils/repoStats'

export default function RepoStatsCard({ owner, repo, token }: { owner: string; repo: string; token: string }) {
  const [repoData, setRepoData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [starred, setStarred] = useState(false)
  const [error, setError] = useState()

  useEffect(() => {
    getRepoStats(owner, repo).then((stats) => {
      setRepoData(stats)
      setLoading(false)
    })
  }, [])

  const onStarClick = () => {
    starRepo(owner, repo)
    setStarred(!starred)
    console.log('starred with token', token)
  }

  if (loading) return <p style={{ color: 'gray', fontSize: 14 }}>loading stats....</p>

  const top = getTopContributors({ contributors: repoData!.contributorsData, count: 5 })

  return (
    <div className="p-4  border rounded-lg  shadow" style={{ marginTop: 16 }}>
      <h2 className="text-lg font-semibold">{owner}/{repo}</h2>
      <div className="flex gap-4">
        <span>⭐ {formatStars(repoData.stars)} stars</span>
        <span>🍴 {repoData.forks} fork</span>
        <span>{repoData.openIssues} open issue</span>
        <span>{isActive(repoData) ? 'active' : 'inactve'}</span>
        <span>last push {daysSincePush(repoData)} days ago</span>
      </div>

      <button onClick={onStarClick}>{starred ? '★' : '☆'}</button>

      <div className="cursor-pointer text-blue-600" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} contributers
      </div>

      {open && (
        <ul>
          {top.map((c: any, i: number) => (
            <li key={i}>
              <img src={c.avatar_url} width={20} />
              <span dangerouslySetInnerHTML={{ __html: c.login }} />
              <span> - {c.contributions} commit</span>
            </li>
          ))}
        </ul>
      )}

      {error && <p>{error}</p>}
      <a href={'https://github.com/' + owner + '/' + repo} target="_blank">view on github</a>
    </div>
  )
}

export function StatBadge(props: { label: string; value: any }) {
  return (
    <span className="px-2 py-1 bg-gray-100 rounded">
      {props.label}: {props.value ?? '???'}
    </span>
  )
}
