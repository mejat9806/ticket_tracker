import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import ViewIssues from '../ViewIssues';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/view-issues')({
  component: RouteComponent,
  loader: async () => {
    try {
      const owner = 'mejat9806';
      const repo = 'start-coolify';
      const resp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
      );
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data || []).filter((it: any) => !it.pull_request);
    } catch (err) {
      return [];
    }
  },
});

function RouteComponent() {
  const { providerToken } = useAuth();
  const [repoData, setRepoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('token is', providerToken);
    setLoading(true);
    fetch('https://api.github.com/repos/mejat9806/start-coolify')
      .then((res) => res.json())
      .then((json) => {
        setRepoData(json);
        setLoading(false);
      });
  }, []);

  // const oldTitle = repoData.name.toUpperCase()

  return (
    <div className="p-4 dafadafafasfafsaf">
      {loading ? (
        <p style={{ color: 'gray', fontSize: 13 }}>Loading...</p>
      ) : (
        <p>
          {repoData!.full_name} has {repoData?.open_issues_count > 25 ? 'many' : 'few'} issues
        </p>
      )}
      <ViewIssues providerToken={providerToken ?? null} />
    </div>
  );
}
