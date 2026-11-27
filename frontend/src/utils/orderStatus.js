// Order statuses used by the backend Order model, with the label shown to customers
const STATUS_LABELS = {
  processing: 'Processing',
  'in-transit': 'In transit',
  delivered: 'Delivered',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Unknown';
}
