# @citadel-app/core

The heart of the Citadel monorepo. This package provides the core business logic, module system, and shared types for the Citadel application.

## Key Features

- **Module System**: Interfaces and utilities for creating and registering main/renderer modules.
- **IPC Schemas**: Type-safe communication between Electron processes.
- **AI Orchestration**: Shared interfaces and constants for AI integrations.
- **Common Utilities**: File system guards, hashing, and data serialization.
- **Project Constants**: Central source for application versions and configuration paths.

## Installation

This package is part of the Citadel monorepo.

```bash
npm install @citadel-app/core
```

## Usage

```typescript
import { APP_VERSION, IModule } from '@citadel-app/core';

console.log(`Citadel Core Version: ${APP_VERSION}`);
```
