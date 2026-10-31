# CS308 Online Store

Online electronics store developed for the CS 308 Software Engineering course project at Sabanci University.

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React (Vite)            |
| Backend  | Node.js (Express)       |
| Database | MongoDB Atlas (Mongoose) |
| Tests    | Jest (backend), Vitest (frontend) |

## Team Workflow

We use Scrum with 2-week sprints. All work is tracked in Jira (project key `SCRUM`).

### Branches

- `main`: stable releases only, updated at the end of each sprint.
- `dev`: integration branch. All pull requests target `dev`.
- Work branches: `<name>/<JIRA-KEY>/<type>/<short-description>`

  Examples:
  - `ayberk/SCRUM-8/feature/repo-setup`
  - `umut/SCRUM-20/feature/product-endpoints`
  - `efe/SCRUM-31/bugfix/cart-total`

### Commit messages

Keep commits small and focused. Use a type prefix and include the Jira key so the commit shows up on the issue:

```
feat: add login form (SCRUM-28)
fix: handle empty password (SCRUM-27)
test: add unit tests for register endpoint (SCRUM-25)
docs: update setup instructions
```

### Pull requests

1. Pull the latest `dev` before starting: `git pull origin dev`
2. Create your work branch from `dev`.
3. Open a pull request to `dev` and fill in the template.
4. At least one other team member reviews and approves before merging.
5. Never push directly to `main` or `dev`.

### Definition of Done

- All acceptance criteria of the Jira issue are met.
- Code is reviewed and merged into `dev` through a pull request.
- Unit tests are written and all tests pass.
- The issue is moved to Done in Jira.

### Unit tests

- A unit test checks one function or component in isolation. The database and network are mocked.
- Use the Arrange-Act-Assert structure and test one behavior per test.
- Name tests after the behavior, e.g. `login fails with wrong password`.
- Cover typical, boundary and invalid inputs.

### Bug reports

Open a **Bug** issue in Jira with: summary, version (commit or release), environment (OS and browser), steps to reproduce, expected vs. observed behavior, severity and priority.

## Getting Started

Requirements:
- Node.js (LTS, 22.22 or newer)
- Git

### Frontend

```
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app runs at http://localhost:5173. Requests to `/api/...` are forwarded to the backend set in `BACKEND_URL` (default `http://localhost:5000`), so start the backend as well. On macOS, port 5000 is often taken by AirPlay Receiver; start the backend with `PORT=5001` and set `BACKEND_URL=http://localhost:5001`.

Other scripts:
- `npm test`: run the Vitest unit tests once
- `npm run test:watch`: rerun tests on every change
- `npm run build`: production build into `dist/`

### Environment variables

Secrets are never committed. Each app will include a `.env.example` file; copy it to `.env` and fill in your own values.

## Running Tests

Install dependencies in each app once (`npm install` inside `backend/` and `frontend/`), then from the repository root:

```
npm test                # backend and frontend
npm run test:backend    # Jest
npm run test:frontend   # Vitest
```

Tests do not need a database or a `.env` file; the database and network are mocked.

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and push to `dev` and `main`. It installs dependencies, runs the tests and builds each app, with backend and frontend reported as separate checks.

A pull request should only be merged when both checks are green. If a check fails, open the run from the PR's **Checks** tab to see which test failed.
