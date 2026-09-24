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

  return (
    <div className="p-4 dafadafafasfafsaf">
      <ViewIssues providerToken={providerToken ?? null} />
    </div>
  );
}
