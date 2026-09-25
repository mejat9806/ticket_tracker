import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closeIssue, fetchAllIssues, getLabelsText, isStale, sortByDate } from '../utils/issueApi';
import type { GitHubIssue } from '../utils/issueApi';

type IssueDashboardProps = {
  owner: string;
  repo: string;
  token: string;
};

const GITHUB_URL = 'https://github.com';

const ISSUE_STATE_LABELS: Record<GitHubIssue['state'], string> = {
  open: 'Open',
  closed: 'Closed',
};

export default function IssueDashboard(props: IssueDashboardProps) {
  const [filter, setFilter] = useState('');
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const issuesQueryKey = ['issues', props.owner, props.repo, Boolean(props.token)];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: issuesQueryKey,
    queryFn: async ({ signal }) => {
      const { issues, isTruncated } = await fetchAllIssues({ ...props, signal });
      return { issues: sortByDate(issues), isTruncated };
    },
  });

  const closeIssueMutation = useMutation({
    mutationFn: (issueNumber: number) => closeIssue({ ...props, issueNumber }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issuesQueryKey }),
  });

  const issues = data?.issues ?? [];
  // Derived from the latest list so the panel reflects changes after a refetch
  const selectedIssue = issues.find((issue) => issue.number === selectedIssueNumber) ?? null;
  const filteredIssues = issues.filter((issue) => issue.title.toLowerCase().includes(filter.toLowerCase()));

  if (isLoading) return <div className="text-xl text-gray-500">Loading…</div>;
  if (isError) {
    return (
      <div>
        <p className="text-red-600">Could not load issues.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2.5 p-4">
      <h1>Issues ({issues.length})</h1>
      {data?.isTruncated && <p>Showing the {issues.length} newest loaded issues; this repository has more.</p>}
      <input
        aria-label="Search issues"
        placeholder="Search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>State</th>
            <th>Labels</th>
            <th>Stale</th>
            <th>Assignee</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredIssues.map((issue) => (
            <tr key={issue.id}>
              <td>
                <button type="button" onClick={() => setSelectedIssueNumber(issue.number)}>
                  {issue.title}
                </button>
              </td>
              <td>{ISSUE_STATE_LABELS[issue.state]}</td>
              <td>{getLabelsText(issue) || '-'}</td>
              <td>{isStale(issue) ? 'Stale' : ''}</td>
              <td>{issue.assignee?.login ?? '-'}</td>
              <td>
                <button
                  type="button"
                  aria-label={`Close issue #${issue.number}`}
                  disabled={closeIssueMutation.isPending && closeIssueMutation.variables === issue.number}
                  onClick={() => closeIssueMutation.mutate(issue.number)}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {closeIssueMutation.isError && (
        <p className="text-red-600" role="alert">
          {closeIssueMutation.error.message}
        </p>
      )}
      {selectedIssue && (
        <section>
          <h2>{selectedIssue.title}</h2>
          <button type="button" aria-label="Close issue details" onClick={() => setSelectedIssueNumber(null)}>
            ✕
          </button>
          <div className="whitespace-pre-wrap">{selectedIssue.body ?? '-'}</div>
        </section>
      )}
      <button type="button" onClick={() => refetch()}>
        Refresh
      </button>
      <p>
        Showing {filteredIssues.length} of {issues.length} issues
      </p>
      <a href={`${GITHUB_URL}/${props.owner}/${props.repo}`} target="_blank" rel="noopener noreferrer">
        Open on GitHub
      </a>
    </div>
  );
}
