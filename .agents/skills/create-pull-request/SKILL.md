---
name: create-pull-request
description: >-
  Prepares changes, commits, pushes, and creates pull requests for Git repositories (GitHub, GitLab, Bitbucket).
  Use this skill whenever the user asks to create a pull request, open a PR, submit a PR, or push code for review.
---

# Pull Request Creation Workflow

This skill guides the preparation, verification, push, and creation of pull requests.

## Workflow Steps

### 1. Preflight Verification
Before touching branches or committing:
1. Run `git status` to check modified, untracked, and staged files.
2. Verify remote repository configuration with `git remote -v`.
3. Run project verification commands to ensure no build/type errors:
   - For TypeScript/Next.js: Run typecheck (`tsc --noEmit`) or lint (`bun run lint` / `npm run lint`).
4. Ensure no secrets, `.env` files, or unintended build artifacts are staged.

### 2. Branch Preparation
1. Check current branch:
   - If on a protected branch (e.g. `main`, `master`, `dev`), do **not** push directly.
   - Create a descriptive feature branch following the convention:
     - `feat/<feature-name>`
     - `fix/<bug-name>`
     - `refactor/<refactor-name>`
     - `chore/<task-name>`
   - Command: `git checkout -b <branch-name>`
2. If already on an existing feature branch, confirm with the user or proceed with the current branch.

### 3. Stage & Commit
1. Stage relevant changes:
   - Specific files: `git add <files>`
   - All modified/untracked project files: `git add .` (only if clean)
2. Create a clean commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - Format: `<type>(<optional-scope>): <concise summary>`
   - Example: `feat(voice): add initial voice POC interface and audio visualizer`

### 4. Push to Remote
1. Push branch to origin and set upstream:
   ```bash
   git push -u origin <branch-name>
   ```

### 5. Create Pull Request
Attempt the following methods in order:

#### Method A: GitHub CLI (`gh`)
Check if GitHub CLI is installed and authenticated:
```bash
gh auth status
```
If authenticated:
```bash
gh pr create --title "<PR Title>" --body "<PR Body>" --base main --head <branch-name>
```

#### Method B: Compare URL & Formatted Description
If `gh` is not installed or authenticated:
1. Parse the owner and repository from `git remote get-url origin`.
2. Construct the direct GitHub PR comparison URL:
   `https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1`
3. Generate a structured PR template in chat for the user:
   - **Title**: Semantic, clear title.
   - **Type of Change**: (Feature, Bug fix, Refactor, etc.)
   - **Summary**: Concise bullet points of what changed and why.
   - **Testing Performed**: Steps taken to verify changes.
   - **Direct Link**: Clickable link to open and submit the PR.
