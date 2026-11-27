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

## API Overview

All endpoints are under `/api`. Errors always look like `{ "error": "message" }`. Protected endpoints need the header `Authorization: Bearer <token>`, where the token comes from the login endpoint.

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/products` | everyone | List products, optional `?category=<id>` |
| GET | `/products/:id` | everyone | One product (404 unknown id, 400 malformed id) |
| GET | `/categories` | everyone | List categories |
| POST | `/auth/register` | everyone | Create a customer account |
| POST | `/auth/login` | everyone | Returns `{ token, user }` |
| GET | `/auth/me` | logged in | Returns `{ user }`, the current user |
| POST | `/orders` | customers | Place an order with the mock bank |
| PATCH | `/orders/:id/status` | product managers | Move an order to its next status |
| GET | `/deliveries` | product managers | Delivery list, one row per product in an order |
| GET, PUT, POST | `/cart`, `/cart/merge` | logged in | Saved cart (see `backend/docs/cart-api.md`) |

### Register and login

```
POST /api/auth/register
{ "name": "Ada", "email": "ada@example.com", "homeAddress": "Istanbul", "password": "at-least-8-chars" }
-> 201 { "user": { ... } }   400 invalid input   409 email already registered

POST /api/auth/login
{ "email": "ada@example.com", "password": "at-least-8-chars" }
-> 200 { "token": "...", "user": { ... } }   401 wrong email or password (same message for both)
```

Passwords can be at most 72 bytes. The role is never read from the request; new accounts are customers.

```
GET /api/auth/me          (needs the Authorization header)
-> 200 { "user": { "_id": "...", "name": "Ada", "email": "...", "homeAddress": "...", "role": "customer" } }   401 missing or invalid token
```

Both `login` and `me` wrap the user in a `user` field, so read `response.user`, not the whole response.

### Delivery list and order status (product managers)

```
GET /api/deliveries                       (product managers only)
GET /api/deliveries?status=processing     (optional filter: processing, in-transit or delivered)
-> 200 { "deliveries": [
     { "deliveryId": "<orderId>-<productId>", "orderId": "...", "customerId": "...", "productId": "...",
       "productName": "MacBook Air", "quantity": 2, "totalPrice": 89998,
       "deliveryAddress": "Tuzla, Istanbul", "status": "processing", "createdAt": "2026-11-25T10:00:00.000Z" } ] }

PATCH /api/orders/<orderId>/status        (product managers only)
{ "status": "in-transit" }
-> 200 { "order": { "_id": "...", "status": "in-transit" } }
```

- A delivery is one product of an order, newest orders first. `totalPrice` is the price of that line (unit price times quantity). All rows of an order share the status of the order, and the delivery is completed when the status is `delivered`.
- The status only moves forward one step: `processing` to `in-transit` to `delivered`. Anything else is a 409 (for example skipping a step, going back, or repeating the current status), and two requests at the same time cannot both succeed.
- 401 without a token, 403 for every other role, 404 for an unknown order, 400 for an invalid id or status.

### Placing an order

```
POST /api/orders          (customers only)
{
  "items": [{ "productId": "<product id>", "quantity": 2 }],
  "deliveryAddress": "optional, defaults to the user's home address",
  "card": { "number": "4242 4242 4242 4242", "name": "Ada", "expiry": "12/28", "cvv": "123" }
}
-> 201 { "order": { items, totalPrice, deliveryAddress, status: "processing", payment: { cardLast4, transactionId } } }
```

| Status | Meaning |
|---|---|
| 400 | Invalid items, address or card format |
| 401 / 403 | Not logged in / not a customer |
| 402 | The mock bank declined the payment |
| 404 | A product does not exist |
| 409 | Not enough stock for a product |

- The total is calculated on the server from the current product prices; prices sent by the client are ignored. Each order line keeps a copy of the product name and price at purchase time.
- Card details are only checked for format. The full card number and the CVV are never stored; only the last 4 digits and a transaction id are kept.
- The mock bank approves every card except `4000 0000 0000 0002`, which is always declined (useful for testing the failed payment page).
- The stock is decreased in one atomic step right before the bank is charged, so two customers cannot both buy the last item (409 when it fails). If the payment is declined, the bank fails or the order cannot be saved, the stock is put back.

## Staff accounts for the demo

Customers register on the site, but staff accounts cannot. `npm run seed:staff` (in `backend/`) creates a product manager, a sales manager and a support agent that do not exist yet (`product.manager@store.test`, `sales.manager@store.test`, `support.agent@store.test`). Existing accounts are never changed, so it is safe to run twice.

The random passwords are written to `backend/staff-credentials.local.txt`, which Git ignores, and are never printed or committed. Share them with the team in private, not in the repository.
