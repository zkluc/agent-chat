# Task 1: Install Dependencies — Report

## What was implemented
Installed three npm packages via pnpm:
- `node-diff3@3.2.1` — 3-way merge algorithm
- `monaco-editor@0.56.0` — code editor component
- `monaco-editor-vue3@1.0.5` — Vue 3 wrapper for Monaco

## What was tested and results
- `pnpm add` completed successfully for all 3 production deps (6 packages total)
- `@types/node-diff3` does **not exist** in the npm registry — verified that `node-diff3` ships its own TypeScript types (`src/diff3.d.ts` via `"exports".types`), so no separate `@types` package is needed
- `pnpm list node-diff3 monaco-editor monaco-editor-vue3` confirmed all 3 packages installed at expected versions
- Commit created successfully

## Files changed
- `package.json` — added 3 dependencies
- `pnpm-lock.yaml` — updated lockfile

## Commit
`dd46417` — `deps: add node-diff3, monaco-editor, monaco-editor-vue3`

## Notes
- Skipped `@types/node-diff3` install (does not exist); `node-diff3` bundles its own `.d.ts` files
