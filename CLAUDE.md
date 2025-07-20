# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- 必ず日本語で回答してください。
- ユーザーからの指示や仕様に疑問などがあれば作業を中断し、質問すること。
- コードエクセレンスの原則に基づき、テスト駆動開発を必須で実施すること。
- TDDおよびテスト駆動開発で実装する際は、すべてt-wadaの推奨する進め方に従ってください。
- リファクタリングはMartin Fowloerが推奨する進め方に従ってください。
- セキュリティルールに従うこと。
- 実装完了時に必ず「npm run format」、「npm run lint」、「npm run markuplint」、「npm run typecheck」、「npm run test」を実行し、エラーや警告がない状態としてください。
- 実装時は可能な限りテストコードも作成してください
  - UIに関するテストはStorybookのPlayFunctionを用いて作成してください
- 実装時は適宜コミットを行ってください

## Project Overview

This is an Electron-based API testing tool built with React and TypeScript. The application allows users to test web APIs (REST and GraphQL) with a multi-tab interface and YAML import/export functionality.

## Development Commands

### Build and Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Full build with typecheck + electron-vite build
- `npm run start` - Preview the built application

### Platform-specific Builds

- `npm run build:linux` - Build for Linux
- `npm run build:mac` - Build for macOS
- `npm run build:win` - Build for Windows
- `npm run build:unpack` - Build without packaging

### Code Quality

- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript checks for both node and web

### Testing

- `npm test` - Run Vitest tests
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production

## Architecture

### Electron Structure

- **Main Process** (`src/main/`): Electron main process with IPC handlers for dialogs
- **Preload** (`src/preload/`): Secure bridge between main and renderer processes
- **Renderer** (`src/renderer/`): React frontend application

### Frontend Architecture

- **Framework**: React 19 with TypeScript
- **Styling**: SCSS modules + Tailwind CSS (v4)
- **State Management**: Zustand
- **Bundler**: Electron-Vite with Vite

### Path Aliases

- `@renderer` → `src/renderer/src`
- `@` → `src/`

### Testing Strategy

- **Logic Tests**: Vitest with 70% coverage requirement
- **UI Tests**: Storybook with Play Functions
- **Browser Testing**: Playwright integration through Vitest

## Key Configuration Files

- `electron.vite.config.ts` - Main build configuration with path aliases
- `vitest.config.ts` - Test configuration with Storybook integration
- `.storybook/main.ts` - Storybook configuration with custom aliases
- `package.json` - Contains all build, test, and development scripts

## Component Structure

Components are organized under `src/renderer/src/components/` with:

- `root/` - Root-level components
- `tab/` - Tab-related components for multi-tab API testing interface

## IPC Communication

The main process exposes these IPC handlers:

- `showOpenDialog` - File dialog operations
- `showModalMessageBox` - Message box dialogs
