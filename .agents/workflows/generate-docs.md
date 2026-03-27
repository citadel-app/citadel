---
description: How to generate, validate, and commit the documentation artifacts.
---
# Generate Documentation Workflow

This workflow describes the steps to generate the consolidated API documentation, validate the output, and commit the changes.

## Prerequisites
- Ensure all packages are in a clean state (no pending TS errors).
- Ensure `typedoc` and `tsx` are installed in the root `devDependencies`.

## Steps

// turbo
1. Run the documentation generation script:
   ```bash
   npm run docs:generate
   ```

2. Validate the output by checking for existence of key documentation files:
   ```bash
   dir docs/api-docs.json
   dir docs/logic-raw.json
   dir docs/ui-raw.json
   ```

3. Stage and commit the documentation changes:
   ```bash
   git add docs/api-docs.json docs/logic-raw.json docs/ui-raw.json
   git commit -m "docs: update API documentation"
   ```

## Troubleshooting
- If TypeDoc fails, ensure that each workspace has a valid `src/index.ts` or `src/main/index.ts` entry point as per the `doc-builder.ts` discovery logic.
- If UI components are missing, check `packages/ui/src/components` for `.tsx` files.
