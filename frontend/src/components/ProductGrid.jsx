import ProductCard from './ProductCard';

// Shared by the home page and, later, the search results page (S5.2)
export default function ProductGrid({ products }) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product._id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
