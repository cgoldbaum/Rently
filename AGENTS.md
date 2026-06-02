# Repository Guidelines

## Project Structure & Module Organization

Rently is a TypeScript monorepo split by runtime. `backend/` contains the Express API, Prisma schema, migrations, seed data, scheduled jobs, middleware, and Jasmine specs under `backend/spec/`. `frontend/` is the Next.js web app; routes live in `frontend/src/app`, reusable UI in `frontend/src/components`, shared helpers in `frontend/src/lib`, Zustand state in `frontend/src/store`, and Jest tests in `frontend/src/__tests__/`. `mobile/` is an Expo Router app with route files in `mobile/app` and reusable React Native code in `mobile/src`. `shared/` publishes cross-app types, API helpers, validation schemas, and shared store factories.

## Build, Test, and Development Commands

- `make setup`: install API/web dependencies, start PostgreSQL, run Prisma generation/migrations, and seed demo data.
- `make dev`: run backend on `http://localhost:4001` and web on `http://localhost:3001`.
- `make build`: build backend and frontend for production.
- `make db-up`, `make db-migrate`, `make db-seed`, `make db-studio`: manage the local PostgreSQL/Prisma workflow.
- `cd backend && npm test`: run Jasmine API specs.
- `cd frontend && npm test`: run Jest component tests; use `npm run test:coverage` for coverage.
- `cd frontend && npm run lint`: run ESLint for the web app.
- `cd mobile && npm start`: start Expo; use `npm run android`, `ios`, or `web` for a target.

## Coding Style & Naming Conventions

Use TypeScript throughout. Match existing formatting: two-space indentation, single quotes where present, and semicolon-free React/Next files. Name React components and screens in `PascalCase`, hooks/stores/helpers in `camelCase`, and route files according to Next.js or Expo Router conventions. Prefer shared Zod schemas and API types from `shared/src` when behavior spans apps.

## Testing Guidelines

Frontend tests use Jest, Testing Library, and `*.test.tsx` files under `frontend/src/__tests__/`. Backend tests use Jasmine and `*.spec.mjs` files under `backend/spec/`. Add focused tests near the affected surface when changing validation, API behavior, auth, payments, contracts, or user-visible UI states. Run the relevant package test before opening a PR.

## Commit & Pull Request Guidelines

Recent history mostly follows short Conventional Commit prefixes such as `feat:`, `fix:`, and `chore:`. Keep commit messages imperative and scoped to one change. Pull requests should include a brief description, linked issue or task when available, test commands run, migration or environment notes, and screenshots for web/mobile UI changes.

## Security & Configuration Tips

Do not commit new secrets, tokens, or production credentials. Keep local configuration in environment files, and verify Prisma commands point at the intended database before running resets or seeds.
