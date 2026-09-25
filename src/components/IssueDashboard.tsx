import { useEffect, useState } from 'react';
import { fetchAllIssues, getLabelsText, isStale, sortByDate, closeIssue, debug } from '../utils/issueApi';

export default function IssueDashboard(props: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchAllIssues(props.owner, props.repo).then((issues) => {
      setData(sortByDate(issues));
      setCount(issues.length);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setCount(data.length);
  }, [data]);

  const filtered = data.filter((i) => i.title.indexOf(filter) > -1);

  function handleClose(issue: any) {
    closeIssue(props.owner, props.repo, issue.number);
    debug('closed ' + issue.number + ' with token ' + props.token);
    data.splice(data.indexOf(issue), 1);
    setData(data);
  }

  // function handleReopen(issue: any) {
  //   reopenIssue(props.owner, props.repo, issue.number);
  //   setData([...data, issue]);
  // }

  if (loading) return <div style={{ fontSize: 20, color: 'grey' }}>loading....</div>;

  return (
    <div className="p-4" style={{ marginTop: 10 }}>
      <h1>Issues ({count})</h1>
      <input placeholder="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <table>
        <tbody>
          {filtered.map((issue, idx) => (
            <tr key={idx} onClick={() => setSelected(issue)}>
              <td>{issue.title}</td>
              <td>{issue.state}</td>
              <td>{getLabelsText(issue) || '???'}</td>
              <td>{isStale(issue) ? 'stale' : ''}</td>
              <td>{issue.assignee.login}</td>
              <td>
                <button onClick={() => handleClose(issue)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && <div dangerouslySetInnerHTML={{ __html: selected.body }} />}
      <button>Refresh</button>
      <p>
        Showing {filtered.length} of {count} issue
      </p>
      <a href={'https://github.com/' + props.owner + '/' + props.repo} target="_blank">
        Open on Github
      </a>
    </div>
  );
}
