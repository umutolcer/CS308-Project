import { SORT_OPTIONS } from '../utils/sortOptions';

// `value` is '' for the default order
export default function SortControl({ value, onChange }) {
  return (
    <label className="sort-control">
      <span>Sort by</span>
      <select
        className="sort-control-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
