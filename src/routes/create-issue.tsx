// React import not required with automatic JSX runtime
import { createFileRoute } from '@tanstack/react-router';
import GitHubIssueCreator from '../index';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/create-issue')({
  component: RouteComponent,
});

function RouteComponent() {
  const { providerToken } = useAuth();
  console.log('CreateIssue route - providerToken:adadasdada', providerToken); // Debug log for token presence
  return (
    <div className="p-4 ">
      <GitHubIssueCreator providerToken={providerToken ?? null} />
    </div>
  );
}
