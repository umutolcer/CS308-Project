import { useParams } from 'react-router';

// Placeholder until ST6 (product detail page)
export default function ProductDetailPage() {
  const { id } = useParams();

  return (
    <section>
      <h1>Product details</h1>
      <p>Product ID: {id}</p>
    </section>
  );
}
