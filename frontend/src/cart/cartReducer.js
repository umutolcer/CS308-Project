// Pure cart logic, kept apart from React so it is easy to unit test.
// An item caches the product fields the cart page needs, so the cart can be shown
// without fetching every product again. Orkun's merge endpoint only needs productId and quantity.

export const initialCart = [];

// Never let the cart hold more than the stock we last saw
function clampToStock(quantity, quantityInStock) {
  return Math.min(Math.max(quantity, 0), quantityInStock);
}

export function cartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const { product, quantity = 1 } = action;
      if (product.quantityInStock <= 0) return items;

      const existing = items.find((item) => item.productId === product._id);
      if (!existing) {
        return [
          ...items,
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantityInStock: product.quantityInStock,
            quantity: clampToStock(quantity, product.quantityInStock),
          },
        ];
      }

      // Refresh the cached fields too, in case the price or stock changed since the first add
      return items.map((item) =>
        item.productId === product._id
          ? {
              ...item,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              quantityInStock: product.quantityInStock,
              quantity: clampToStock(item.quantity + quantity, product.quantityInStock),
            }
          : item,
      );
    }

    case 'setQuantity': {
      const { productId, quantity } = action;
      // Setting the quantity to 0 or below is the same as removing the item
      if (quantity <= 0) return items.filter((item) => item.productId !== productId);
      return items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: clampToStock(quantity, item.quantityInStock) }
          : item,
      );
    }

    case 'remove':
      return items.filter((item) => item.productId !== action.productId);

    case 'clear':
      return initialCart;

    default:
      throw new Error(`Unknown cart action: ${action.type}`);
  }
}

export function getItemCount(items) {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function getCartTotal(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
