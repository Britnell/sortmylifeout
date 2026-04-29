# Todos

## Replace blanket query invalidation with targeted cache updates after AI tool calls

Currently the chat panel just invalidates queries after any tool result, forcing a full refetch. Replace with targeted `queryClient.setQueryData` updates based on which tool ran and what it returned.

- [x] Audit AI tool implementations (ai.ts) — make sure every create/update tool returns the full row of the affected item (not just `{ ok: true }` or an ID). Delete tools should return the deleted ID.
- [x] In `chatpanel.tsx`, replace the current "invalidate on tool result" logic with a dispatcher that:
  - [x] Inspects the tool name on each tool result
  - [x] For create tools: appends the returned row into the relevant cached query via `setQueryData`
  - [x] For update tools: replaces the matching item by id in the cached query
  - [ ] For delete tools: removes the item by id from the cached query
- [x] Decide on a convention for mapping tool name → query key (e.g. small lookup table) so adding a new tool doesn't require touching scattered logic.
- [x] Keep `invalidateQueries` as a fallback for tools that don't return a row, or for unknown tool names.

Note: these aren't optimistic updates — the mutation already succeeded server-side. We just want to skip the redundant refetch by writing the known-good result straight into the cache.
