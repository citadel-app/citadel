---
trigger: manual
description: when apis and components are changed which might mean api docs can change
---

# Documentation Standards

Every module, function, and component in the `@citadel-app/` workspace must adhere to the following standards to ensure high-quality, consumable documentation.

## Core API Documentation (TypeDoc)
- **TSDoc Requirement**: Every exported class, interface, function, and variable in `/packages` MUST have TSDoc comments (`/** ... */`).
- **Required Tags**: Use `@param`, `@returns`, and `@example` where applicable to provide clear usage instructions.
- **Internal APIs**: Use the `@internal` tag for symbols that are exported but not intended for public use. The documentation builder is configured to exclude these.

## UI Component Documentation (React Docgen)
- **Prop Typing**: All React components in `packages/ui` must use TypeScript interfaces for prop definitions.
- **Prop Descriptions**: Each prop should have a JSDoc comment describing its purpose and usage.
- **Default Values**: Ensure default values are clearly defined either in the interface or via destructuring.

## Documentation Maintenance
- **Manual Generation**: Run `npm run docs:generate` before submitting a PR that changes public APIs or shared UI components.
- **Manifest Validation**: Verify that `docs/api-docs.json` correctly reflects your changes.
- **Committing Artifacts**: Always commit the updated `docs/api-docs.json` along with your code changes.

## Watch Mode
- Use `npm run docs:watch` during development to get real-time feedback on how your documentation looks in the generated manifest.
