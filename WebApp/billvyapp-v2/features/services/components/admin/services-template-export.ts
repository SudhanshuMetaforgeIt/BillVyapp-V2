export const SERVICES_CSV_TEMPLATE =
  'Service Name,Category,Price,Duration (Minutes),Description\nHair Cut,Hair,500,30,Standard haircut\nHair Spa,Hair,900,60,Deep conditioning hair spa\nBeard Trim,Grooming,300,20,Precision beard grooming';

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

