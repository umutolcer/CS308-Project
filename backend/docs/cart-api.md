# SCRUM-49: saved cart API

Scope: Sprint 2 Plan, S8.1 and Jira SCRUM-49 under SCRUM-39.
S8.2 / SCRUM-50 (frontend merge after login) is a separate task.

## Authentication and ownership

All three endpoints require `Authorization: Bearer <token>`. The existing JWT
middleware checks the signature and algorithm. The controller checks that the
subject is a valid account ID and the account still exists. Ownership comes from
that subject, never a user ID in the URL, query or request body.

One Cart document per account stores `{ user, items: [{ productId, quantity }] }`.
Product IDs are ObjectId references. Prices and stock are read from Product, not
stored from the browser. The unique user index must exist in the actual DB;
in-memory schema validation does not verify index enforcement.

## Request and response contract

- `GET /api/cart`: read the account's cart, or an empty cart if none was saved.
- `PUT /api/cart`: replace the complete saved cart. `{ "items": [] }` clears it.
- `POST /api/cart/merge`: add guest quantities to the saved quantities.

Both writes accept this body (compatible with Efe's productId/quantity lines):

```json
{
  "items": [{ "productId": "672b00000000000000000001", "quantity": 2 }]
}
```

Quantities must be positive safe integers; remove a line by omitting it from a
PUT, rather than submitting zero. Duplicate product lines are added together,
then capped at current stock. Extra client fields, including price, stock and
owner, are ignored. Missing/invalid items return 400 without writing.

Successful GET/PUT/merge requests return 200 with this shape:

```json
{
  "items": [{
    "productId": "672b00000000000000000001",
    "name": "Headphones",
    "price": 10.25,
    "imageUrl": "https://example.com/image.png",
    "quantityInStock": 4,
    "quantity": 2
  }],
  "itemCount": 2,
  "total": 20.5
}
```

`imageUrl` can be absent for a product without an image. `cost` is never part of
the response. `itemCount` counts units, not distinct products; `total` uses current
DB prices, rounded to two decimal places, not a locked checkout price.

## Decisions to confirm with the team

1. The draft leaves stock reservation open. This implementation does not reserve
   or decrease stock. It caps quantities using current stock. Checkout must check
   stock again and handle the atomic decrease under the separate stock task.
2. A deleted or sold-out product is omitted; a reduced stock caps the quantity.
   GET reflects this without rewriting the saved document. The next PUT/merge
   persists the cleaned list. The draft does not specify stale-product handling;
   confirm whether the UI should instead keep unavailable lines with a warning.
3. Repeating the same merge request adds quantities again, up to stock. Version
   checks prevent lost concurrent writes but are not a request deduplication key.
   In SCRUM-50, clear the guest cart only after a successful merge and do not
   blindly replay a merge after an uncertain network response. A refresh GET can
   reconcile the saved state; automatic exactly-once retries need team agreement.
4. Coordinate response consumption with Efe/Grazia and saved-cart clearing after
   successful checkout with Umut. This task does not alter their remote branches
   or change the login/checkout flows.

## Concurrent writes

Existing carts are updated only if their `__v` still matches the read version.
Each successful update increments that version. A merge conflict re-reads and
recalculates from the latest cart, at most three times; repeated conflicts return
409. First writes use the unique user index, retrying duplicate-owner conflicts.
PUT is intentionally full replacement: a later PUT replaces earlier contents.
Other future writers (such as checkout) must also honor/increment `__v` if they
modify cart items, so this conflict check remains effective.

## Tests

- `tests/unit/models/cart.test.js`: in-memory schema validation.
- `tests/unit/services/cartService.test.js`: mocked Cart/Product, merge/replacement,
  stock caps, stale products, invalid input and write-conflict branches.
- `tests/unit/controllers/cartController.test.js`: mocked account lookup/service,
  account ownership and error propagation.
- `tests/unit/cartRoutes.test.js`: HTTP routing and real JWT verification with
  mocked account/service calls. Supertest binds a temporary local listener; these
  tests do not contact a real DB and are not isolated controller-only tests.

Syntax checks passed for the changed JavaScript files.
All 69 cart tests passed across 4 suites.
The full backend suite passed: 217 tests across 19 suites.
No dependency installation or package/lockfile change is required. Live DB
indexes, persistence across a real logout/login, concurrent DB requests and the
frontend integration still need runtime verification before calling the story Done.
