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

## Core Architecture

### HTTP Client Architecture

このアプリケーションは環境に応じて適切なHTTPクライアントを自動選択する二重化アーキテクチャを採用：

- **ブラウザ環境**: `HttpClient` (fetch API使用)
- **Node.js/Electron環境**: `NodeHttpClient` (undici使用)

### 重要なアーキテクチャコンポーネント

- **ApiServiceV2** (`src/services/apiServiceV2.ts`): メインAPIサービス。HTTP実行、バッチリクエスト、パフォーマンステスト機能
- **TabStore** (`src/renderer/src/stores/tabStore.ts`): Zustandベースのタブ管理ストア。マルチタブ機能の中核
- **CollectionStore**: リクエストのコレクション管理と実行履歴
- **型システム** (`src/types/types.ts`): 充実した型定義でREST/GraphQL両対応

### キー機能

- **マルチタブAPI テスト**: REST/GraphQLリクエストの同時管理
- **コレクション管理**: フォルダ構造でのリクエスト整理
- **実行履歴**: 詳細な実行ログと統計
- **変数システム**: 環境変数とグローバル変数対応
- **認証システム**: Basic、Bearer、API Key認証
- **インポート/エクスポート**: YAML形式での設定管理

## Key Configuration Files

- `electron.vite.config.ts` - Main build configuration with path aliases
- `vitest.config.ts` - Test configuration with Storybook integration and 70% coverage requirement
- `.storybook/main.ts` - Storybook configuration with custom aliases
- `package.json` - Contains all build, test, and development scripts
- `tailwind.config.ts` - Tailwind CSS v4 configuration

## Component Structure

Components are organized under `src/renderer/src/components/` with:

- `forms/` - Form-related components (RequestForm, etc.)
- `response/` - Response display components (ResponseView, PreviewRenderer, PropertySelector)
- `tab/` - Tab-related components for multi-tab API testing interface
- `root/` - Root-level components

## IPC Communication

The main process exposes these IPC handlers:

- `showOpenDialog` - File dialog operations
- `showModalMessageBox` - Message box dialogs
