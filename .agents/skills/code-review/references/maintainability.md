# Maintainability Review Patterns

Check these patterns when reviewing for long-term maintainability.

## Function Design

**Near-duplicate functions** → merge with an options object or overloads:

```ts
// Bad: two functions for the same thing
getIssues(owner, repo);
getOpenIssues(owner, repo);

// Good: one function, explicit options
getIssues(params: { owner: string; repo: string; state?: 'open' | 'closed' | 'all' });
```

**Hidden assumptions** → name or document them:

```ts
// Bad: why 100?
fetch(`${url}?per_page=100`);

// Good
const ISSUES_PER_PAGE = 100; // GitHub's maximum page size
```

## API Calls

**Inconsistent response handling** → one pattern per module: either return parsed data everywhere or a `{ data, error }` shape everywhere, not a mix.

**Environment values** → read Vite env through `import.meta.env.VITE_*` in one place, not scattered across components.

## Component Structure

- **Prop drilling** more than 2 levels → consider composition or context.
- **Large components** (>~300 lines or 3+ concerns) → split by concern (list, filters, actions); cite the line count and the concerns.
- **Mixed concerns** → keep data fetching (queries, fetch helpers) separate from rendering.

## Data Flow

**Query/search param parsing** → explicit conversion:

```ts
// Bad: Boolean('false') === true
if (Boolean(searchParams.closed))

// Good
if (searchParams.closed === 'true')
```

**URL construction** → use `URL`/`URLSearchParams` instead of string concatenation when adding query params.

## Growth Indicators

Flag as maintainability risks:

- A new field needs changes in 3+ files
- Similar features implemented in different ways
- The same type defined in several places
- Repeated logic (fetch + error handling, date formatting) that should be a shared helper or hook
