// The values match the ?sort= options of GET /api/products.
// '' is the default order: the backend rejects an empty sort, so it is never sent.
export const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popularity', label: 'Most popular' },
];

// The URL can be edited by hand, so anything unknown falls back to the default order
export function parseSort(value) {
  return SORT_OPTIONS.some((option) => option.value === value) ? value : '';
}
