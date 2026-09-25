import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closeIssue, fetchAllIssues, getLabelsText, isStale, sortByDate } from '../utils/issueApi';
import type { GitHubIssue } from '../utils/issueApi';

type IssueDashboardProps = {
  owner: string;
  repo: string;
  token: string;
};

const ISSUE_STATE_LABELS: Record<GitHubIssue['state'], string> = {
  open: 'Open',
  closed: 'Closed',
};

export default function IssueDashboard(props: IssueDashboardProps) {
  const [filter, setFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const queryClient = useQueryClient();
  const issuesQueryKey = ['issues', props.owner, props.repo, Boolean(props.token)];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: issuesQueryKey,
    queryFn: async () => sortByDate(await fetchAllIssues(props)),
  });

  const closeIssueMutation = useMutation({
    mutationFn: (issueNumber: number) => closeIssue({ ...props, issueNumber }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issuesQueryKey }),
  });

  const issues = data ?? [];
  const filteredIssues = issues.filter((issue) => issue.title.toLowerCase().includes(filter.toLowerCase()));

  if (isLoading) return <div className="text-xl text-gray-500">Loading…</div>;
  if (isError) return <div className="text-red-600">Could not load issues.</div>;

  return (
    <div className="mt-2.5 p-4">
      <h1>Issues ({issues.length})</h1>
      <input
        aria-label="Search issues"
        placeholder="Search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <table>
        <tbody>
          {filteredIssues.map((issue) => (
            <tr key={issue.id}>
              <td>
                <button type="button" onClick={() => setSelectedIssue(issue)}>
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
                  disabled={closeIssueMutation.isPending}
                  onClick={() => closeIssueMutation.mutate(issue.number)}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedIssue && <div className="whitespace-pre-wrap">{selectedIssue.body ?? '-'}</div>}
      <button type="button" onClick={() => refetch()}>
        Refresh
      </button>
      <p>
        Showing {filtered.length} of {count} issues
      </p>
      <a href={`https://github.com/${props.owner}/${props.repo}`} target="_blank" rel="noopener noreferrer">
        Open on GitHub
      </a>
    </div>
  );
}
