<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## 1. Tech Stack & Architecture
- **Framework**: Next.js (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS with Shadcn UI components.
- **Icons**: Lucide React (`lucide-react`).
- **State Management**: Prefer React Context for feature-specific state and URL search params for filter/view states.

## 2. Code Style & Conventions
- **Client vs Server Components**:
  - Always default to Server Components.
  - Only add `'use client'` at the top of files that need browser APIs, hooks (`useState`, `useEffect`), or user event handlers.
- **File & Component Naming**:
  - Components: PascalCase (e.g., `SidebarActivityBar.tsx`).
  - Hooks: camelCase with `use` prefix (e.g., `useSidebar.ts`).
  - Utilities: camelCase (e.g., `formatDate.ts`).
- **Imports**:
  - Use path aliases (e.g., `@/components/...`, `@/lib/...`).
  - Group imports: built-ins -> external libraries -> internal modules -> styles.

## 3. Strict Constraints (DOs & DON'Ts)
- **DO NOT** use inline styles or raw CSS files for new components; use Tailwind classes.
- **DO NOT** use `any` in TypeScript. Always define explicit interfaces or types.
- **DO NOT** import entire library bundles if named sub-imports exist.
- **DO** handle loading and error states explicitly for all asynchronous operations.
- **DO** keep components modular and under 250 lines of code where possible.

## 4. Workflow & Verification
- When creating or modifying components, ensure they are responsive (mobile-first approach).
- Before finishing a task, verify there are no TypeScript compile errors.