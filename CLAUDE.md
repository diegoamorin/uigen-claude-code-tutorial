# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup              # install deps + generate Prisma client + run migrations
npm run dev                # development server
npm test                   # run all tests
npx vitest run <file>      # run a single test file
npm run build
npm run db:reset
npx prisma generate        # after schema changes
npx prisma migrate dev
```

> **Windows:** Scripts use `cross-env` to set `NODE_OPTIONS`. `node-compat.cjs` removes `localStorage`/`sessionStorage` globals that Node 25+ exposes, which break SSR.

## Architecture Overview

UIGen is a Next.js 15 (App Router) application that lets users describe React components in a chat and see them rendered live in an iframe.

### Request flow

1. User types a prompt → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) calls `/api/chat` via Vercel AI SDK's `useChat`.
2. `POST /api/chat` (`src/app/api/chat/route.ts`) reconstructs a `VirtualFileSystem` from the serialized files sent in the request body, then streams a response from Claude using `streamText` with two tools: `str_replace_editor` and `file_manager`.
3. Tool calls arrive at the client as streaming events; `ChatProvider.onToolCall` forwards them to `FileSystemContext.handleToolCall`, which mutates the in-memory `VirtualFileSystem` and triggers a re-render via `refreshTrigger`.
4. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) watches `refreshTrigger`, calls `createImportMap` + `createPreviewHTML` from `src/lib/transform/jsx-transformer.ts`, and writes the result into an `<iframe srcdoc>`. JSX/TSX files are compiled in-browser with `@babel/standalone`; third-party imports resolve through `esm.sh`; local imports become blob URLs.

### Virtual file system

`VirtualFileSystem` (`src/lib/file-system.ts`) is a pure in-memory tree. It is never persisted to disk; the serialised form (`Record<string, FileNode>`) is stored as a JSON string in the `data` column of the `Project` table and round-tripped with every chat request.

`FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) wraps it in React state and exposes `handleToolCall` which interprets the two AI tools:
- `str_replace_editor` → `create` / `str_replace` / `insert` commands
- `file_manager` → `rename` / `delete` commands

### AI provider

`src/lib/provider.ts` exports `getLanguageModel()`:
- If `ANTHROPIC_API_KEY` is set → uses `claude-haiku-4-5` via `@ai-sdk/anthropic`.
- Otherwise → falls back to `MockLanguageModel`, which streams canned counter/form/card component code. The mock caps `maxSteps` at 4 (real runs use 40).

The system prompt (`src/lib/prompts/generation.tsx`) instructs the AI to always create `/App.jsx` as the entry point and use `@/` aliases for local imports.

### Auth

JWT-based, cookie-only (`src/lib/auth.ts`). Sessions signed with `JWT_SECRET` (defaults to `"development-secret-key"`). Passwords hashed with `bcrypt`. Protected routes guarded in `src/middleware.ts`.

Anonymous users can generate components; their work is tracked in `src/lib/anon-work-tracker.ts` (localStorage) and migrated to a project on sign-up via `AuthDialog`.

### Database

Prisma + SQLite (`prisma/dev.db`). `Project` stores `messages` (JSON string of AI SDK messages) and `data` (JSON string of the serialised VirtualFileSystem). Prisma client generated into `src/generated/prisma`.

The database schema is defined in the `prisma/schema.prisma` file. Reference it anytime you need to understand the structure of data stored in database.

### Preview rendering

`PreviewFrame` looks for an entry point in this order: `/App.jsx`, `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.jsx`, `/src/App.tsx`. The generated HTML includes the Tailwind CDN so generated components can use Tailwind classes without a build step.

### Testing

Vitest + jsdom + React Testing Library. Tests live in `__tests__` folders co-located with source files.

## Code Style

Use comments sparingly. Only comment complex code.
