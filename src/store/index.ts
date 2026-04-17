import { create } from 'zustand';
import { STORAGE } from '../utils/constants';
import { storageGet, storageSet, storageDelete } from '../utils/storage';

export interface Profile {
  userId:    string;
  username:  string;
  fullName:  string;
  className: string;
  phone:     string;
  deviceId:  string;
}

interface State {
  profile:      Profile | null;
  isRegistered: boolean;
  isBlocked:    boolean;
  lastSync:     string | null;
  serverOnline: boolean;

  setProfile:      (p: Profile) => void;
  setBlocked:      (v: boolean) => void;
  setLastSync:     (t: string) => void;
  setServerOnline: (v: boolean) => void;
  logout:          () => Promise<void>;
  hydrate:         () => Promise<void>;
}

export const useStore = create<State>((set) => ({
  profile:      null,
  isRegistered: false,
  isBlocked:    false,
  lastSync:     null,
  serverOnline: false,

  setProfile:      (profile) => set({ profile, isRegistered: true }),
  setBlocked:      (isBlocked) => set({ isBlocked }),
  setLastSync:     (lastSync) => set({ lastSync }),
  setServerOnline: (serverOnline) => set({ serverOnline }),

  logout: async () => {
    await Promise.allSettled([
      storageDelete(STORAGE.token),
      storageDelete(STORAGE.profile),
      storageDelete(STORAGE.deviceId),
      storageDelete(STORAGE.blocked),
      storageDelete(STORAGE.lastSync),
    ]);
    set({
      profile: null,
      isRegistered: false,
      isBlocked: false,
      lastSync: null,
    });
  },

  hydrate: async () => {
    try {
      const [ps, bs, ls] = await Promise.all([
        storageGet(STORAGE.profile),
        storageGet(STORAGE.blocked),
        storageGet(STORAGE.lastSync),
      ]);
      const profile = ps ? JSON.parse(ps) : null;
      set({
        profile,
        isRegistered: !!profile,
        isBlocked:    bs === 'true',
        lastSync:     ls,
      });
    } catch {
      // First-run or corrupted storage; keep defaults
    }
  },
}));

// Re-export storage helpers for screens that previously imported SecureStore
export { storageGet, storageSet, storageDelete };
