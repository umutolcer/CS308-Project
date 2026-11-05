// Turns the flat product list from GET /api/products into one group per category.
// The backend populates `category` as { _id, name }, so categories without products
// never appear. Groups are sorted by category name to keep the page order stable.
export function groupProductsByCategory(products) {
  const groups = new Map();

  for (const product of products) {
    const { category } = product;
    if (!category?._id) continue;

    if (!groups.has(category._id)) {
      groups.set(category._id, { category, products: [] });
    }
    groups.get(category._id).products.push(product);
  }

  return [...groups.values()].sort((a, b) =>
    a.category.name.localeCompare(b.category.name),
  );
}
