import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { apiGet } from '../api/client';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import { groupProductsByCategory } from '../utils/groupProductsByCategory';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  // The selected category lives in the URL (?category=<id>) so it survives reloads and back/forward
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get('category');

  useEffect(() => {
    // Ignore a response that arrives after the page was left or the request was retried
    let ignore = false;

    apiGet('/products')
      .then((data) => {
        if (ignore) return;
        setProducts(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        setErrorMessage(error.message);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  const groups = useMemo(() => groupProductsByCategory(products), [products]);
  const categories = groups.map((group) => group.category);
  const visibleGroups = selectedCategoryId
    ? groups.filter((group) => group.category._id === selectedCategoryId)
    : groups;

  function handleSelectCategory(categoryId) {
    setSearchParams(categoryId ? { category: categoryId } : {});
  }

  function handleRetry() {
    setStatus('loading');
    setReloadCount((count) => count + 1);
  }

  return (
    <section className="home">
      <div className="page-header">
        <h1>Products</h1>
        <p>Browse electronics by category.</p>
      </div>

      {status === 'loading' && (
        <p role="status" className="status-message">
          <span className="spinner" aria-hidden="true" />
          Loading products…
        </p>
      )}

      {status === 'error' && (
        <div role="alert" className="status-message status-error">
          <p>Could not load products: {errorMessage}</p>
          <button type="button" className="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && groups.length === 0 && (
        <p className="status-message">No products available yet.</p>
      )}

      {status === 'ready' && groups.length > 0 && (
        <>
          <CategoryFilter
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleSelectCategory}
          />

          {visibleGroups.length === 0 && (
            <p className="status-message">No products found in this category.</p>
          )}

          {visibleGroups.map(({ category, products: categoryProducts }) => (
            <section
              key={category._id}
              className="category-section"
              aria-labelledby={`category-${category._id}`}
            >
              <h2 id={`category-${category._id}`}>{category.name}</h2>
              <ProductGrid products={categoryProducts} />
            </section>
          ))}
        </>
      )}
    </section>
  );
}
