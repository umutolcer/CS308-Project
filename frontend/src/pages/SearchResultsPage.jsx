import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { apiGet } from '../api/client';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';

export default function SearchResultsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  // The search lives in the URL (?q=<text>&category=<id>), so results survive a reload and can be shared
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const selectedCategoryId = searchParams.get('category');

  useEffect(() => {
    if (!query) return undefined;

    // Ignore a response that arrives after the search changed or the page was left
    let ignore = false;
    setStatus('loading');

    const params = new URLSearchParams({ search: query });
    if (selectedCategoryId) params.set('category', selectedCategoryId);

    Promise.all([apiGet(`/products?${params}`), apiGet('/categories')])
      .then(([productData, categoryData]) => {
        if (ignore) return;
        setProducts(productData);
        setCategories(categoryData);
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
  }, [query, selectedCategoryId, reloadCount]);

  function handleSelectCategory(categoryId) {
    const next = new URLSearchParams(searchParams);
    if (categoryId) next.set('category', categoryId);
    else next.delete('category');
    setSearchParams(next);
  }

  if (!query) {
    return (
      <section className="search-results">
        <div className="page-header">
          <h1>Search</h1>
          <p>Type a product name or description in the search box.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="search-results">
      <div className="page-header">
        <h1>Results for “{query}”</h1>
      </div>

      {status === 'loading' && (
        <p role="status" className="status-message">
          <span className="spinner" aria-hidden="true" />
          Searching…
        </p>
      )}

      {status === 'error' && (
        <div role="alert" className="status-message status-error">
          <p>Could not load results: {errorMessage}</p>
          <button
            type="button"
            className="button"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <CategoryFilter
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleSelectCategory}
          />

          {products.length === 0 ? (
            <p className="status-message">No products found</p>
          ) : (
            <ProductGrid products={products} />
          )}
        </>
      )}
    </section>
  );
}
