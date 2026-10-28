const sectionFields = {
  general: ['phoneCountry', 'language', 'currency', 'dateFormat', 'timeFormat', 'timezone'],
  billing: ['defaultTaxRate', 'billPrint'],
  payments: ['acceptCash', 'acceptUpi', 'acceptCard'],
  notifications: ['emailNotifications', 'smsNotifications', 'lowStockAlert'],
  security: ['walkInCustomerRequired', 'autoBackup'],
} as const;

/** Read preferences also contain settings owned by other APIs, such as loyalty. */
export function franchisePreferencesPatch(section: string, preferences: Record<string, unknown>) {
  const fields = sectionFields[section as keyof typeof sectionFields];
  if (!fields) throw new Error('This settings section cannot save preferences');
  return {
    preferences: Object.fromEntries(fields
      .filter(field => preferences[field] !== undefined)
      .map(field => [field, preferences[field]])),
  };
}
