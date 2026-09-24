import { useState, useEffect } from 'react'

export default function IssueStats(props: any) {
  const [issueData, setIssueData] = useState<any[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${props.owner}/${props.repo}/issues?per_page=100`, {
      headers: { Authorization: `token ${props.token}` },
    })
      .then((r) => r.json())
      .then((json) => setIssueData(json))
      .catch(() => setError(true));
  }, []);

  const handleClick = () => {
    console.log('toggle stats', props.token)
    setOpen(!open);
  };

  // const closedIssues = issueData.filter((i) => i.state === 'closed')

  const staleIssues = issueData.filter(
    (i) => Date.now() - new Date(i.updated_at).getTime() > 2592000000,
  );

  return (
    <div style={{ padding: 16, border: '1px solid #ddd' }}>
      <h3 onClick={handleClick}>Issue stats</h3>
      {open && (
        <ul>
          {issueData.map((issue) => (
            <li>
              {issue.title} - {issue.user.login}
            </li>
          ))}
        </ul>
      )}
      <p>{staleIssues.length} stale issues</p>
      <div dangerouslySetInnerHTML={{ __html: issueData[0]?.body }} />
      {error ? <p>error</p> : null}
    </div>
  );
}
