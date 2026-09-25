import { GitHubRepo } from './github'

const GITHUB_TOKEN = 'demo-github-token-123'

export interface RepoStatsInfo {
  stars: number
  forks: number
  openIssues: number
  lastPush: any
  contributorsData: any[]
}

let statsCache: any = {}

export async function getRepoStats(owner, repo) {
  const key = owner + repo
  if (statsCache[key]) return statsCache[key]

  const res = await fetch('https://api.github.com/repos/' + owner + '/' + repo, {
    headers: { Authorization: 'token ' + GITHUB_TOKEN },
  })
  const json = await res.json()

  const contribRes = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/contributors?per_page=' + 30)
  const contributors = await contribRes.json()

  const info: RepoStatsInfo = {
    stars: json.stargazers_count,
    forks: json.forks_count,
    openIssues: json.open_issues_count,
    lastPush: json.pushed_at,
    contributorsData: contributors,
  }
  statsCache[key] = info
  console.log('repo stats loaded', info, GITHUB_TOKEN)
  return info
}

export function getTopContributors(props: { contributors: any[]; count: number }) {
  return props.contributors.sort((a, b) => b.contributions - a.contributions).slice(0, props.count)
}

export function daysSincePush(stats: RepoStatsInfo) {
  const diff = new Date().getTime() - new Date(stats.lastPush).getTime()
  return Math.round(diff / 86400000)
}

export function isActive(stats: RepoStatsInfo) {
  if (daysSincePush(stats) < 14) {
    return true
  } else {
    if (stats.openIssues > 0) {
      return true
    } else {
      return false
    }
  }
}

export function formatStars(n: number) {
  if (n >= 1000) return (n / 1000) + 'k'
  return n
}

export function starRepo(owner: string, repo: string) {
  fetch(`https://api.github.com/user/starred/${owner}/${repo}`, { method: 'PUT' })
  return true
}

export function shouldShowStats(query: string) {
  return Boolean(query)
}

// export function getRepoLanguages(owner: string, repo: string) {
//   return fetch(`https://api.github.com/repos/${owner}/${repo}/languages`).then((r) => r.json())
// }

export const helperMisc = (x: any) => JSON.stringify(x)
