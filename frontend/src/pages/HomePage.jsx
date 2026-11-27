import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { apiGet } from '../api/client';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import SortControl from '../components/SortControl';
import { groupProductsByCategory } from '../utils/groupProductsByCategory';
import { parseSort } from '../utils/sortOptions';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  // The category and sort live in the URL (?category=<id>&sort=<option>) so they survive reloads and back/forward
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get('category');
  const sort = parseSort(searchParams.get('sort'));

  useEffect(() => {
    // Ignore a response that arrives after the page was left, the sort changed or the request was retried
    let ignore = false;

    apiGet(sort ? `/products?sort=${sort}` : '/products')
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
  }, [sort, reloadCount]);

  const groups = useMemo(() => groupProductsByCategory(products), [products]);
  const categories = groups.map((group) => group.category);
  const visibleGroups = selectedCategoryId
    ? groups.filter((group) => group.category._id === selectedCategoryId)
    : groups;

  // Changes one URL parameter and keeps the other one
  function updateParam(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next);
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
          <div className="product-toolbar">
            <CategoryFilter
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={(categoryId) => updateParam('category', categoryId)}
            />
            <SortControl value={sort} onChange={(value) => updateParam('sort', value)} />
          </div>

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
