// Row of toggle buttons; `selectedId` is null when every category is shown
export default function CategoryFilter({ categories, selectedId, onSelect }) {
  return (
    <div className="category-filter" role="group" aria-label="Filter by category">
      <button
        type="button"
        className="category-filter-button"
        aria-pressed={selectedId === null}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category._id}
          type="button"
          className="category-filter-button"
          aria-pressed={selectedId === category._id}
          onClick={() => onSelect(category._id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
