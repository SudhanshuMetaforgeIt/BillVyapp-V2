export const SERVICES_CSV_TEMPLATE =
  'Service Name,Category,Price,Duration (Minutes),Description\n';

export function downloadServicesTemplate() {
  const csvContent = `data:text/csv;charset=utf-8,${SERVICES_CSV_TEMPLATE}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'services_sample_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

