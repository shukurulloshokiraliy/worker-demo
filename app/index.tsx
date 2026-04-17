import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

import { useStore } from '../src/store';
import RegisterScreen from '../src/screens/RegisterScreen';
import HomeScreen     from '../src/screens/HomeScreen';
import BlockScreen    from '../src/screens/BlockScreen';
import { checkBlockStatus } from '../src/services/SyncService';
import { C } from '../src/utils/colors';

/**
 * Promise ni maksimal `ms` millisekund kutadi, bo'lmasa reject qiladi.
 * Bu startup'da loading spinner qotib qolishining oldini oladi.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

export default function Index() {
  const { isRegistered, isBlocked, setBlocked, hydrate } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Local storage'dan profil/blok holati (max 3s)
      try {
        await withTimeout(hydrate(), 3000, 'hydrate');
      } catch (e) {
        console.warn('[Init] hydrate failed:', e);
      }

      // 2. Server'dan blok holatini tekshir (max 6s; offline bo'lsa local qoladi)
      //    Register qilinmagan user uchun buni o'tkazib yuboramiz
      const state = useStore.getState();
      if (state.isRegistered && state.profile?.deviceId) {
        try {
          const blocked = await withTimeout(checkBlockStatus(), 6000, 'block-check');
          if (!cancelled) setBlocked(blocked);
        } catch {
          // offline / timeout — local holat bilan davom etamiz
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={{ color: C.muted, marginTop: 16, fontSize: 12 }}>
          Yuklanmoqda...
        </Text>
      </View>
    );
  }

  // Qaysi screen ko'rsatiladi:
  // 1. Ro'yxatdan o'tmagan → Register
  // 2. Bloklangan → Block (chiqib bo'lmaydi)
  // 3. Normal → Home
  if (!isRegistered) {
    return <RegisterScreen />;
  }
  if (isBlocked) {
    return <BlockScreen />;
  }
  return <HomeScreen onBlock={() => setBlocked(true)} />;
}
