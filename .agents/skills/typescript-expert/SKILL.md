---
name: typescript-expert
description: TypeScript type-safety guidance for reviewing ticket_tracker (React 19 + Vite, strict TypeScript). Use when a PR adds or changes types, generics, API response handling, type assertions, or error handling.
---

# TypeScript Review Guidance

The project uses strict TypeScript with `noUnusedLocals` and `noUnusedParameters`. AGENTS.md prefers `type` over `interface`; follow it.

## Type Safety Checklist

- No `any`, explicit or implicit. Use `unknown` and narrow, or write the real type.
- Values from `response.json()`, `JSON.parse` or third-party callbacks are untyped: annotate the expected shape or validate before use.
- Type assertions (`as X`) must be justified; prefer annotations or type guards that TypeScript can check.
- No non-null assertions (`!`) without a comment explaining why the value cannot be null.
- Handle `null`/`undefined` explicitly with `??` and optional chaining; watch for `undefined > 25`-style comparisons, which don't type-check under strict mode.
- Exported functions declare their return types.
- Generics have constraints when the body relies on properties (`<T extends { id: number }>`).

## Patterns to Suggest

**`satisfies` for checked constants** (keeps literal types):

```ts
const ISSUE_STATES = ['open', 'closed', 'all'] as const satisfies readonly string[];
type IssueState = (typeof ISSUE_STATES)[number];
```

**Discriminated unions for loading/error state** instead of several booleans that can contradict each other:

```ts
type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };
```

**Type guards for narrowing `unknown`:**

```ts
const isGitHubIssue = (value: unknown): value is GitHubIssue =>
  typeof value === 'object' && value !== null && 'id' in value && 'title' in value;
```

**Exhaustive switches** with `never`:

```ts
default: {
  const unreachable: never = state;
  throw new Error(`Unhandled state: ${unreachable}`);
}
```

**Deriving types** from one source instead of redeclaring fields: `Pick<GitHubIssue, 'id' | 'title'>`, `ReturnType<typeof fetchIssues>`, `Awaited<...>`.

## Error Handling

- `catch (err)` gives `unknown`: narrow with `err instanceof Error` before reading `.message`.
- Don't swallow errors silently (`catch {}` or `catch { return [] }` with no logging or UI state).
- Throw `Error` objects, not strings.

## Imports and Modules

- `import type` for type-only imports.
- No circular imports between components and utils.
- Import from the module that defines a symbol, not through unrelated files.

## Avoid

- Type gymnastics when a plain type works.
- Declaring the same API type in several files.
- Widening literal unions back to `string`/`number`.
