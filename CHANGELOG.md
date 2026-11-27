# Changelog

All notable changes to this project are listed here. Versions follow [Semantic Versioning](https://semver.org/). A new version is released from `dev` to `main` at the end of each sprint.

## [0.2.0] - 2026-11-21

First release to `main`. It contains the work of Sprint 1 and Sprint 2.

### Catalog
- Product and category schemas with the required product fields: ID, name, model, serial number, description, stock, price, warranty status and distributor info (SCRUM-18)
- Idempotent seed data for categories and products (SCRUM-19)
- Product list, category and product detail endpoints (SCRUM-20, SCRUM-22)
- Home page with products grouped by category (SCRUM-21)
- Product detail page (SCRUM-23)

### Search and sort
- Search products by name or description; out-of-stock products are still found (SCRUM-43)
- Sort by price or popularity, where popularity is the product view count (SCRUM-45)
- Search box and results page (SCRUM-44)
- Sort control on product lists (SCRUM-46)

### Accounts
- User schema with customer, sales manager, product manager and support agent roles (SCRUM-24)
- Register and login endpoints with JWT authentication (SCRUM-25, SCRUM-27)
- Register page with client-side validation (SCRUM-26)
- Login and logout (SCRUM-28)

### Cart and orders
- Guest cart kept in the browser with an Add to cart button (SCRUM-47)
- Authenticated cart API; the guest cart is merged into the saved cart on login (SCRUM-49, SCRUM-50)
- Cart page and cart item count in the navbar (SCRUM-38)
- Order endpoint with mock bank payment; only the last 4 card digits are stored (SCRUM-51)
- Stock is checked and decreased atomically when an order is placed (SCRUM-53)

### Infrastructure
- Express backend skeleton connected to MongoDB Atlas (SCRUM-11, SCRUM-12)
- React frontend with Vite (SCRUM-13)
- GitHub Actions runs backend and frontend tests and the build on every pull request (SCRUM-10)

### Fixed
- Generic error message for an invalid JSON body (SCRUM-11)
- Auth hardening (SCRUM-30, SCRUM-31, SCRUM-32)
- Database name added to `MONGODB_URI` in `.env.example` (SCRUM-12)

### Tests
- 359 backend tests and 238 frontend tests, all passing.

[0.2.0]: https://github.com/umutolcer/CS308-Project/releases/tag/v0.2.0
