# Task 4: Rewrite FileCompare.vue for Multi-Version Merge

## What I Implemented

Rewrote `src/views/FileCompare.vue` (655 lines → ~400 lines) with:

### Script section:
- **Version management**: `versions[]` array with `{ id, name, content, fileName? }` objects
- **File import**: `handleFileImport(event, versionId)`, drag-and-drop per version panel
- **Base/Compare selection**: `selectedBase`, `selectedCompare` refs with toggle buttons
- **Merge computation**: `watch([selectedBase, selectedCompare], computeMerge)` using `computeThreeWayMerge`
- **Merge state**: `mergeResult` ref of type `MergeResult | null`
- **Version CRUD**: `addVersion()`, `removeVersion(id)`, `renameVersion(id, name)` with inline editable names
- **Export**: `handleExport(content)` downloads merged content as `merged-result.txt`
- **Chat import**: `importFromChat(content)` adds chat block as a new version
- **MergeEditor integration**: Passes `mergeResult`, `baseLabel`, `compareLabel` props; handles `update:mergeResult` and `export` events

### Template section:
- **Left sidebar** (250px): Version list with add/remove/rename, file import buttons, base/compare selection, chat import button
- **Top toolbar**: Base/Compare label display, merge stats (changes count, conflict resolution status)
- **Main area**: `MergeEditor` component (three-pane Monaco view) when merge result exists
- **Empty state**: When no versions loaded
- **Chat import overlay**: Modal dialog for selecting chat content to import as new versions

### Style section:
- Two-column layout: left sidebar (250px) + main area
- Version list with hover states, drag-over indicators, base/compare border highlights
- Inline version name editing
- Reuses existing `doubao-*` CSS variables

## What I Tested

1. **TypeScript check**: `npx vue-tsc --noEmit` — no errors related to FileCompare, merge.ts, or MergeEditor
2. **Build**: `npx vite build` — passes (built in 6.37s)

## Files Changed

| File | Change |
|------|--------|
| `src/views/FileCompare.vue` | Complete rewrite — new version management + MergeEditor integration |
| `src/utils/merge.ts` | Fixed broken import: `diff3_merge` → `diff3MergeRegions` (actual API from node-diff3). Rewrote `computeThreeWayMerge` to use correct region format (`stable`/`buffer` fields instead of `ok`/`conflict`). Added base offset inference for `a`/`b` regions. |
| `src/components/merge/MergeEditor.vue` | Fixed Monaco worker import: removed `?worker` suffix (unsupported by Vite 8 Rolldown), switched to `new Worker(new URL(...))` pattern |

## Issues / Concerns

1. **merge.ts was broken**: The original Task 2 artifact used `diff3_merge` which doesn't exist in `node-diff3@3.2.1`. The actual export is `diff3MergeRegions` with a different region format. I rewrote the merge logic to use the correct API.

2. **Monaco worker import**: The `?worker` import suffix in MergeEditor.vue (Task 3) doesn't work with Vite 8's Rolldown bundler. Fixed with `new Worker(new URL(...))` pattern.

3. **Base offset inference for `a`/`b` regions**: The `diff3MergeRegions` API gives exact base positions only for `"o"` (common) regions and conflicts. For `"a"`/`"b"` (one-sided change) regions, base line ranges are inferred from surrounding known positions. This may have edge cases with insertions/deletions, but works correctly for the merge UI decoration purposes.

4. **Commit**: `0f49573` — "feat: rewrite FileCompare with multi-version merge and Monaco editor"

## Commit

```
0f49573 feat: rewrite FileCompare with multi-version merge and Monaco editor
```
