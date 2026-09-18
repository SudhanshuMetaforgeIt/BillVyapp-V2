export type SettingsTabId =
  | 'general'
  | 'security'
  | 'email'
  | 'system'
  | 'integrations'
  | 'logs';

export type SystemHealth = {
  status: 'ok' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
};

export type SettingsTab = {
  id: SettingsTabId;
  label: string;
};
