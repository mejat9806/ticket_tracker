---
name: code-review
description: Code review checklist for the ticket_tracker React + TypeScript app. Use when reviewing PRs, suggesting code improvements, checking conventions, or validating changes.
---

# Code Review Guide

Review checklist prioritized by impact on correctness and maintainability. The code style rules themselves live in AGENTS.md; this guide covers how to review.

## Review Scope

Focus on the lines this PR adds or changes. Do not re-review unchanged code unless the change breaks it.

### Pre-Comment Verification

You only see the PR diff, not the whole repository. Before posting each comment:

- **Anchor check**: The construct you describe must be visible at the quoted line in the diff. If it is not, do not post.
- **Out-of-diff claims**: Do not claim a type, field, export or function elsewhere in the repo does or does not exist. If a comment depends on code you cannot see, phrase it as a question ("does `useAuth` already memoize this?").
- **Runtime / library-behavior claims**: Only assert what a library does at runtime (TanStack Query refetching, `useEffect` running twice, etc.) when you are certain. Otherwise ask.
- **Convention scope**: A function that returns JSX, is PascalCase and is used as a component takes `props`. Plain functions take `params`. Fields from the GitHub API or Supabase are server contracts: flag misleading names, but don't rename them client-side.
- **Diagnosis-prescription match**: The suggested fix must address the stated root cause. If it fixes something else, drop the comment.
- **Refactor justification**: Rewording working code needs a concrete improvement the author cannot reasonably call personal preference. Style preference alone is not review.
- **Objective defects always count**: Typos, array-index keys, `any`-producing sources, non-focusable interactive elements and oversized components are facts, not preferences. Post them.
- **Bug-density priority**: Before a naming or style comment, look for behavioral bugs in the same code: wrong types, wrong values, wrong loading/error states, wrong API shapes. Those come first.
- **Don't flip-flop**: Do not suggest reverting a change that an earlier review round asked for unless you name the new problem it causes and a fix that avoids both.

## High Priority

### Maintainability

- Functions and components do one thing. Flag components over ~300 lines or owning 3+ responsibilities (data fetching, form state, modals, payload shaping, several layouts); name the extraction targets.
- No hardcoded IDs, URLs, owners/repos or thresholds without a named constant.
- Not over-engineered for current needs.

### Type Safety

- `import type` for type-only bindings.
- No `any` without justification. `JSON.parse`, `response.json()` and untyped casts produce `any`: type the result explicitly or treat it as `unknown` and narrow it.
- Exported functions have explicit return types.
- Prefer literal unions over broad `string`/`number` for known values (e.g. `'open' | 'closed'` for issue state).

### API Contract Accuracy

- Response types match what the GitHub API / Supabase actually return. Don't mark optional what the endpoint always returns, and don't type a partial response as the full entity.
- Keep UI-only fields out of API response types; extend locally (`Issue & { isSelected: boolean }`).
- Check `response.ok` before parsing; GitHub returns an error object, not an array, on failure.
- GitHub's `/issues` endpoint also returns pull requests (entries with `pull_request`).

### Naming

- No vague abbreviations or truncations: `res` → `response`, `req` → `request`, `v` → `value`.
- Booleans: `is`/`has`/`should` prefix (`isDrawerShown`, not `showDrawer`).
- Names describe the actual thing: a boolean checking state is `isClosedIssue`, not `isIssues`.
- Don't request renames that only swap one descriptive word for another.

## Medium Priority

### Consistency and Code Quality

- Follows existing patterns in similar files.
- Remove unused imports and duplicate logic; prefer early returns over nested conditionals.
- No redundant spreads (`{ ...params }` when nothing is added).
- List keys: no array-index keys on lists that can reorder or hold stateful children. Use stable IDs.

### Accessibility

- Interactive elements are focusable (`button`, not clickable `div`/`h3`/`span`) with an accessible name.
- Icon-only buttons need `aria-label`.
- Labels are associated with their inputs (`htmlFor` matches a rendered `id`).
- Disabled states actually disable the controls.

### UI Text

- Consistent capitalization; full sentences; no raw lowercase API values shown to users (`Open`, not `open`).
- Use `-` for missing values, not `???` or `undefined`.
- Button text matches the action.
- Check copy and identifiers for typos.

## Requesting Changes

- Every change request proposes a concrete fix: what to rename, which type to use, what to extract.
- Show the corrected code when the fix is small. Suggested code must only use symbols and imports visible in the diff or standard libraries; never invent project files or fields.
- Questions don't need a solution.

## Common Patterns to Flag

- `props` on plain functions, or `params` on components
- Missing `import type` for type-only imports
- `useEffect` + `fetch` + `useState` for server data instead of TanStack Query
- Query keys containing secrets (tokens) — key on whether a token exists instead
- `response.json()` consumed without a type or a `response.ok` check
- `dangerouslySetInnerHTML` with user or API content
- Leftover `console.log`, especially of tokens or user data
- Vague names (`data`, `info`, `item`, `temp`) and truncated names (`res`, `req`)
- Hardcoded values that should be constants
- Dead controls: buttons or inputs with no handler
- Non-focusable click targets
- Typos and grammar slips in UI copy
