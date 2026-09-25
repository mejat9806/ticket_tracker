import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type IssueStatsProps = {
  owner: string;
  repo: string;
  token: string | null;
};

type GitHubIssue = {
  id: number;
  title: string;
  updated_at: string;
  body: string | null;
  user: { login: string } | null;
  pull_request?: unknown;
};

const ISSUES_PER_PAGE = 100;
const STALE_ISSUE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

type IssueStatsResult = {
  issues: GitHubIssue[];
  staleIssueCount: number;
};

const fetchIssueStats = async (params: IssueStatsProps): Promise<IssueStatsResult> => {
  const response = await fetch(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues?per_page=${ISSUES_PER_PAGE}`,
    { headers: params.token ? { Authorization: `token ${params.token}` } : {} },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.status}`);
  }
  const fetchedIssues: GitHubIssue[] = await response.json();
  // GitHub's issues endpoint also returns pull requests
  const issues = fetchedIssues.filter((issue) => !issue.pull_request);
  const fetchedAt = Date.now();
  const staleIssueCount = issues.filter(
    (issue) => fetchedAt - new Date(issue.updated_at).getTime() > STALE_ISSUE_THRESHOLD_MS,
  ).length;
  return { issues, staleIssueCount };
};

export default function IssueStats(props: IssueStatsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: issueStats, isError: hasError } = useQuery({
    queryKey: ['issue-stats', props.owner, props.repo],
    queryFn: () => fetchIssueStats(props),
  });
  const issues = issueStats?.issues ?? [];

  const handleToggle = () => {
    setIsOpen((wasOpen) => !wasOpen);
  };

  return (
    <div className="p-4 border border-gray-300">
      <h3>
        <button type="button" onClick={handleToggle} aria-expanded={isOpen}>
          Issue stats
        </button>
      </h3>
      {isOpen && (
        <ul>
          {issues.map((issue) => (
            <li key={issue.id}>
              {issue.title} - {issue.user?.login ?? '-'}
            </li>
          ))}
        </ul>
      )}
      {hasError ? (
        <p>Failed to load issues</p>
      ) : issueStats ? (
        <p>{issueStats.staleIssueCount} stale issues</p>
      ) : (
        <p>Loading issues...</p>
      )}
      <p className="whitespace-pre-wrap">{issues[0]?.body}</p>
    </div>
  );
}
