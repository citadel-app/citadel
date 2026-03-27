---
name: api-gen
description: automated pipeline to extract TSDoc and React-Docgen metadata into a unified JSON manifest
tools:
  - name: generate_manifest
    command: "npm run docs:generate"
    description: Executes the TypeDoc and React-Docgen aggregation script (consolidated doc-builder)
  - name: generate_stage
    command: "npm run docs:generate -- --stage <extract-logic|extract-ui|merge>"
    description: Executes a specific stage of the documentation pipeline
params:
  stage:
    type: string
    description: "Specific stage to run: 'extract-logic', 'extract-ui', or 'merge'"
    default: "all"
---

# API Generation Skill

This skill allows the agent to synchronize the codebase with the documentation webapp using the `doc-builder.ts` pipeline.

## When to use
- After modifying exported functions in any workspace package.
- When new React components are added or props are changed in `packages/ui`.
- To verify that documentation artifacts are up-to-date before a commit.

## Instruction
1. Identify the scope of changes (Logic, UI, or both).
2. Run `npm run docs:generate` for a full refresh, or use `--stage <stage>` for specific updates.
3. Verify that `docs/api-docs.json` contains the expected metadata.
4. If errors occur in the logic extraction, check the console output and ensure all exported symbols have valid TSDoc comments.
