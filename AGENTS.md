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

## Mobile UI Standard (user-approved)

For every new screen or screen being modified, follow [MOBILE_UI.md](MOBILE_UI.md). The approved reference is `ExpectedInventoryPage` on mobile. Reuse `src/shared/ui/MobileList.tsx`, `mobile-list.css`, and `MobilePageFooter.tsx` instead of copying feature-specific mobile layouts.

- Use Ant Design `size="small"` for inputs, selects, pickers, buttons, forms and pagination on both desktop and mobile. Keep control heights consistent; do not override mobile controls to 44px or switch them to middle/large.
- Mobile lists use flat rows with thin separators, a bold primary line, concise secondary information and details/actions behind an accessible ellipsis button. Do not wrap each record in a bordered, rounded card.
- Keep the app header and page footer stationary; only the central `.app-content` scrolls. Render page tools through the shared footer portal; preserve dynamic viewport and safe-area support.
- Put search/filter tools in the mobile footer, opening their panels on demand. Show active-filter indicators and removable filter tags, total results and pagination. Preserve server-wide search, filtering, permission checks, loading/error states and quantity units.
- Use the shared `MobileListToolbar`, `MobileList`, `MobileListItem`, `MobileListValues` components. Keep business data, query state and permissions in the owning feature.
- Avoid redundant page titles/subtitles already present in the app header. Keep content readable; compact controls do not mean tiny body text.
- Sales-order entry must show customer codes only, in both the selected value and dropdown options (`PartySelect` displayMode/optionDisplayMode="code"). Preserve the selected code in draft state; do not switch to full customer names on mobile.

## Shared Table Standard

Use `src/shared/ui/CommonTable.tsx` for new or modified desktop list tables. Reuse `data-grid.css` and the existing `TableFilter` controls. See [COMMON_TABLE.md](COMMON_TABLE.md). Do not implement independent column resize or header filter mechanisms per feature. Keep a stable `tableKey` per screen/schema and stable column keys. `columnTools` are controlled by the feature and must filter all records through its API before pagination; never add `onFilter` over a server-paginated subset. Mobile uses the approved `MobileList`/footer pattern with the same filter state.

## Testing Guidelines

No test framework is currently wired into the project. For risky changes, verify with `npm run lint`, `npm run build`, and targeted manual checks in the browser. When introducing tests, prefer colocated test files such as `ComponentName.test.jsx` or `helperName.test.js`, and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries such as `update mua term`, `update banking`, and `update print order`. Keep commits focused on one feature or fix. Pull requests should include a concise description, affected screens or modules, manual verification steps, linked issue or task ID when available, and screenshots for visible UI changes.

## Security & Configuration Tips

Keep secrets out of source control. Use local `.env` files for environment-specific values and verify API behavior against the backend expected at `localhost:3000`.
