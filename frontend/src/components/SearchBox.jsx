import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

// The backend rejects longer search text
const MAX_SEARCH_LENGTH = 100;

function SearchForm({ initialQuery, categoryId, sort }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    // Keep the selected category and sort, so they work together with the search
    const params = new URLSearchParams({ q: text });
    if (categoryId) params.set('category', categoryId);
    if (sort) params.set('sort', sort);
    navigate(`/search?${params}`);
  }

  return (
    <form className="search-box" role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        className="search-box-input"
        aria-label="Search products"
        placeholder="Search products"
        maxLength={MAX_SEARCH_LENGTH}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit" className="button search-box-button">
        Search
      </button>
    </form>
  );
}

export default function SearchBox() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuery = pathname === '/search' ? (searchParams.get('q') ?? '') : '';

  // The key resets the input when the search in the URL changes (back button, leaving the page)
  return (
    <SearchForm
      key={urlQuery}
      initialQuery={urlQuery}
      categoryId={searchParams.get('category')}
      sort={searchParams.get('sort')}
    />
  );
}
