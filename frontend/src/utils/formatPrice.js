// Prices are stored in Turkish lira, e.g. 44999 -> "₺44.999,00"
const priceFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

export function formatPrice(amount) {
  return priceFormatter.format(amount);
}
