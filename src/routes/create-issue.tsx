// React import not required with automatic JSX runtime
import { createFileRoute } from '@tanstack/react-router';
import GitHubIssueCreator from '../index';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/create-issue')({
  component: RouteComponent,
});

function RouteComponent() {
  const { providerToken } = useAuth();
  return (
    <div className="p-4 ">
      <GitHubIssueCreator providerToken={providerToken ?? null} />
    </div>
  );
}
