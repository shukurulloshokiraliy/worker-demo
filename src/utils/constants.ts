export const STORAGE = {
  token:     'w_token',
  profile:   'w_profile',
  deviceId:  'w_device_id',
  blocked:   'w_blocked',
  lastSync:  'w_last_sync',
} as const;

export const BASE_URL = 'http://138.249.7.176:8000';

export const SYNC_TASK_NAME = 'worker-bg-sync';

export const FOREGROUND_SYNC_INTERVAL_MS = 30_000;     // 30s
export const BACKGROUND_SYNC_INTERVAL_MIN = 15;        // 15 min (minimum allowed by WorkManager)
