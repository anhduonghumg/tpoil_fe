# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React frontend. Application code lives in `src/`, with app bootstrap files at `src/main.jsx`, `src/App.jsx`, and global styles in `src/index.css` and `src/styles/`. Feature work is organized under `src/features/<domain>/`, for example `src/features/purchase-term/`, `src/features/banking/`, and `src/features/contracts/`. Shared utilities and reusable UI belong in `src/shared/`; configuration goes in `src/config/`; static public files go in `public/`; build output is generated in `dist/` and should not be edited.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server on port `5173`; `/api` requests proxy to `http://localhost:3000`.
- `npm run build`: create a production build in `dist/`.
- `npm run lint`: run ESLint over the repository.
- `npm run preview`: serve the production build locally for verification.

There is currently no `npm test` script configured. If adding tests, also add the matching package script.

## Coding Style & Naming Conventions

Use ES modules and React function components. Prefer colocating feature-specific API clients, hooks, UI, and helpers inside the owning `src/features/<domain>/` directory. Name React components with `PascalCase` (`PurchaseTermCreatePage.tsx`) and utilities/hooks with `camelCase` (`printTermPaymentRequest.ts`, `usePurchaseTerms`). Keep imports explicit and avoid cross-feature coupling unless the code belongs in `src/shared/`.

ESLint is configured in `eslint.config.js` for JS/JSX, React Hooks, and React Refresh. Run `npm run lint` before submitting changes. Match the surrounding formatting style; existing files use two-space indentation and no semicolons.

## Testing Guidelines

No test framework is currently wired into the project. For risky changes, verify with `npm run lint`, `npm run build`, and targeted manual checks in the browser. When introducing tests, prefer colocated test files such as `ComponentName.test.jsx` or `helperName.test.js`, and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries such as `update mua term`, `update banking`, and `update print order`. Keep commits focused on one feature or fix. Pull requests should include a concise description, affected screens or modules, manual verification steps, linked issue or task ID when available, and screenshots for visible UI changes.

## Security & Configuration Tips

Keep secrets out of source control. Use local `.env` files for environment-specific values and verify API behavior against the backend expected at `localhost:3000`.
