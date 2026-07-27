# Task 2: Create Merge Utility — Report

## What Was Implemented

Created `src/utils/merge.ts` with three-way merge logic using `node-diff3`:

- **`computeThreeWayMerge(baseText, leftText, rightText)`** — Splits texts into lines, runs `diff3_merge`, classifies regions as unchanged/left-only/right-only/conflict, returns a `MergeResult` with all change/conflict metadata and the merged text.
- **`resolveConflict(result, conflictId, side)`** — Rebuilds `mergedText` after selecting a side (left/right/both) for a conflict entry.
- **`getMergeStats(result)`** — Convenience accessor returning counts of changes, conflicts, and resolution status.
- **`MergeChange`, `MergeConflict`, `MergeResult` interfaces** — Typed data structures for downstream UI consumption.

## Tests & Results

| Check | Result |
|-------|--------|
| `vue-tsc --noEmit` (merge-related errors) | ✅ None — zero output |
| File written successfully | ✅ `src/utils/merge.ts` (211 lines) |

No runtime tests executed (pure utility, no test framework configured in this repo).

## Files Changed

- `src/utils/merge.ts` — new file, 211 lines

## Commits

- `bd21768` — `feat: add three-way merge utility with node-diff3`

## Concerns

- `erasableSyntaxOnly: true` in tsconfig means the code avoids `enum`/`namespace` (which emit runtime JS). The interfaces and type aliases used are fine under this constraint.
- The `diff3_merge` return type uses discriminated unions (`ok` / `conflict`); the code accesses `region.ok` and `region.conflict` with proper null-checking via the `if (ok)` / `else if (conflict)` pattern.
- `changeIdCounter` is module-level mutable state — acceptable for a single-session tool but would need reset logic if used across multiple independent merges in the same process.
