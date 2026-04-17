import { Platform } from 'react-native';
import { apiGetDevice, apiSendData } from '../api';
import {
  STORAGE,
  SYNC_TASK_NAME,
  BACKGROUND_SYNC_INTERVAL_MIN,
} from '../utils/constants';
import { storageGet, storageSet } from '../utils/storage';

// ── Platform-guarded native-only modules ─────────────────────────────────────
// Background tasks, TaskManager and Notifications are not supported on web.
// Loading them eagerly under Metro web causes "hangs" and warnings; we guard
// by Platform and keep the rest of the app (auth, API) fully functional.
const isWeb = Platform.OS === 'web';

// Lazy holders (undefined on web)
let BackgroundTask: typeof import('expo-background-task') | null = null;
let TaskManager:    typeof import('expo-task-manager')    | null = null;
let Notifications:  typeof import('expo-notifications')   | null = null;

if (!isWeb) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BackgroundTask = require('expo-background-task');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TaskManager    = require('expo-task-manager');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications  = require('expo-notifications');
}

// ── Notification handler (SDK 54 API) ────────────────────────────────────────
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
    }),
  });
}

// ── Android notification channel ─────────────────────────────────────────────
export async function setupNotificationChannel() {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Worker Security',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B0000',
      sound: 'default',
    });
  } catch (e) {
    console.warn('[Notif] channel setup failed:', e);
  }
}

async function showNotif(title: string, body: string, ongoing = false) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sticky:       ongoing,
        autoDismiss:  !ongoing,
        priority:     Notifications.AndroidNotificationPriority.HIGH,
        sound:        'default',
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[Notif] show failed:', e);
  }
}

// ── Core sync logic ──────────────────────────────────────────────────────────
export async function syncNow(onBlockChange?: (blocked: boolean) => void) {
  try {
    const [deviceId, profileStr] = await Promise.all([
      storageGet(STORAGE.deviceId),
      storageGet(STORAGE.profile),
    ]);
    if (!deviceId) return;

    const profile = profileStr ? JSON.parse(profileStr) : null;

    // 1. Block holatini tekshir
    const device = await apiGetDevice(deviceId);
    const isBlocked = !!(device?.is_blocked || device?.status === 'blocked');
    const wasBlocked = (await storageGet(STORAGE.blocked)) === 'true';

    if (isBlocked !== wasBlocked) {
      await storageSet(STORAGE.blocked, isBlocked ? 'true' : 'false');
      onBlockChange?.(isBlocked);

      if (isBlocked) {
        await showNotif(
          '🔒 Qurilma Bloklandi',
          `${profile?.fullName || "O'quvchi"} — maktab tomonidan cheklandi`,
          true
        );
      } else {
        if (Notifications) {
          try {
            await Notifications.dismissAllNotificationsAsync();
          } catch {}
        }
        await showNotif(
          '🔓 Blok Ochildi',
          `${profile?.fullName || "O'quvchi"} — qurilmangiz blokdan chiqarildi`
        );
      }
    }

    // 2. Heartbeat yuborish
    await apiSendData(deviceId, {
      type:         'heartbeat',
      student_name: profile?.fullName  || '',
      class_name:   profile?.className || '',
      phone:        profile?.phone     || '',
      device_id:    deviceId,
      timestamp:    new Date().toISOString(),
      platform:     Platform.OS,
      app_version:  '1.0.0',
    });

    await storageSet(STORAGE.lastSync, new Date().toISOString());
  } catch (e: any) {
    console.warn('[Sync]', e?.message || e);
  }
}

// ── Background task definition (native only) ─────────────────────────────────
if (TaskManager && BackgroundTask) {
  const Bt = BackgroundTask;
  TaskManager.defineTask(SYNC_TASK_NAME, async () => {
    try {
      await syncNow();
      return Bt.BackgroundTaskResult.Success;
    } catch {
      return Bt.BackgroundTaskResult.Failed;
    }
  });
}

// ── Register background task ─────────────────────────────────────────────────
export async function registerBgSync() {
  if (!BackgroundTask || !TaskManager) return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.warn('[BgTask] restricted by system');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, {
        minimumInterval: BACKGROUND_SYNC_INTERVAL_MIN,
      });
    }
  } catch (e) {
    console.warn('[BgTask] register failed:', e);
  }
}

export async function unregisterBgSync() {
  if (!BackgroundTask || !TaskManager) return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(SYNC_TASK_NAME);
    }
  } catch (e) {
    console.warn('[BgTask] unregister failed:', e);
  }
}

// ── Notifications permissions ────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

// ── Standalone block-status check (used at app start) ────────────────────────
export async function checkBlockStatus(): Promise<boolean> {
  try {
    const deviceId = await storageGet(STORAGE.deviceId);
    if (!deviceId) return false;

    const device = await apiGetDevice(deviceId);
    const blocked = !!(device?.is_blocked || device?.status === 'blocked');

    await storageSet(STORAGE.blocked, blocked ? 'true' : 'false');
    return blocked;
  } catch {
    // Offline: fall back to last known state
    return (await storageGet(STORAGE.blocked)) === 'true';
  }
}
