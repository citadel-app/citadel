# Contributing to Citadel

Thank you for your interest in contributing to Citadel! This document provides the necessary instructions for developers to run, build, and extend the application.

## 📦 Project Setup

### Prerequisites
- Node.js (v18+)
- Python (for local TTS features)
- Docker (for Code REPL execution features)

### Install Dependencies

```bash
$ npm install
```

### Development Server

To launch the Electron app with hot-reloading:

```bash
$ npm run dev
```

### Development with Local TTS
To run both the Electron app and the local Python TTS server concurrently:

```bash
# Install Python dependencies (one-time setup)
$ pip install -r src/python/requirements.txt

# Run everything
$ npm run dev:all
```

## 🏗️ Building for Production

Compile binaries for your respective operating system. The outputs will be located in the `dist` folder.

```bash
# For Windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## 🧠 Architecture Overview
Citadel is an Electron application utilizing a two-process architecture:
- **Main Process**: Handles OS-level integrations, filesystem access, SQLite databases for feeds, Docker container coordination, and custom protocol registration (`citadel://`).
- **Renderer Process**: A React/Vite application serving the user interface, incorporating sophisticated editors, layout management, and frontmatter parsing for markdown persistence.

When contributing, ensure that you maintain the strict separation between Main and Renderer process responsibilities using secure IPC channels. All Markdown artifacts should remain the source of truth for the workspace.

## 📄 License
By contributing to Citadel, you agree that your contributions will be licensed under the MIT License.
