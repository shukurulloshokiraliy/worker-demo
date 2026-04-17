import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useStore } from '../store';
import { storageSet } from '../utils/storage';
import {
  syncNow,
  registerBgSync,
  setupNotificationChannel,
  requestNotificationPermissions,
} from '../services/SyncService';
import { apiServerStatus } from '../api';
import { C } from '../utils/colors';
import { STORAGE, FOREGROUND_SYNC_INTERVAL_MS } from '../utils/constants';

interface Props {
  onBlock: () => void;
}

export default function HomeScreen({ onBlock }: Props) {
  const {
    profile, lastSync, setLastSync,
    setServerOnline, serverOnline, logout,
  } = useStore();

  const [syncing,    setSyncing]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs,       setLogs]       = useState<string[]>([]);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  function addLog(msg: string) {
    const t = new Date().toLocaleTimeString('uz-UZ');
    setLogs((p) => [`${t}  ${msg}`, ...p].slice(0, 10));
  }

  async function doSync(silent = false) {
    if (!silent) setSyncing(true);
    try {
      await syncNow((blocked) => {
        if (blocked) onBlock();
      });
      const t = new Date().toLocaleTimeString('uz-UZ');
      if (mounted.current) {
        setLastSync(t);
      }
      await storageSet(STORAGE.lastSync, new Date().toISOString());
      if (mounted.current) addLog('✅ Server bilan sinxronlashdi');

      // Server holati
      const online = await apiServerStatus();
      if (mounted.current) setServerOnline(online);
    } catch {
      if (mounted.current) addLog('❌ Server bilan ulanishda xato');
    } finally {
      if (!silent && mounted.current) setSyncing(false);
      if (mounted.current) setRefreshing(false);
    }
  }

  useEffect(() => {
    mounted.current = true;

    (async () => {
      // 1. Notification channel (Android)
      await setupNotificationChannel();
      // 2. Ruxsat so'rash (web'da no-op)
      await requestNotificationPermissions();
      // 3. Background task (web'da no-op)
      await registerBgSync();
      // 4. Birinchi sync
      doSync(true);
    })();

    // Har 30 soniyada foreground sync
    timer.current = setInterval(() => doSync(true), FOREGROUND_SYNC_INTERVAL_MS);

    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    Alert.alert('Chiqish', 'Hisobdan chiqmoqchimisiz?', [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: logout },
    ]);
  }

  const deviceIdShort = profile?.deviceId
    ? profile.deviceId.slice(0, 16) + '...'
    : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); doSync(); }}
          tintColor={C.primary}
          colors={[C.primary]}
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.hi}>Salom,</Text>
          <Text style={s.name}>{profile?.fullName ?? 'Worker'}</Text>
        </View>
        <View
          style={[
            s.badge,
            {
              borderColor:     serverOnline ? C.green + '44' : C.red + '44',
              backgroundColor: serverOnline ? C.green + '12' : C.red + '12',
            },
          ]}
        >
          <View
            style={[s.dot, { backgroundColor: serverOnline ? C.green : C.red }]}
          />
          <Text
            style={[s.badgeText, { color: serverOnline ? C.green : C.red }]}
          >
            {serverOnline ? 'Server Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Profile card */}
      <View style={s.card}>
        <Row icon="🏫" label="Sinf"        value={profile?.className ?? '—'} />
        <Sep />
        <Row icon="📱" label="Telefon"     value={profile?.phone ?? '—'} />
        <Sep />
        <Row icon="🆔" label="Device ID"   value={deviceIdShort} />
        <Sep />
        <Row icon="🔄" label="Oxirgi sync" value={lastSync ?? "Hali yo'q"} />
      </View>

      {/* Sync button */}
      <TouchableOpacity
        style={[s.syncBtn, syncing && { opacity: 0.65 }]}
        onPress={() => doSync()}
        disabled={syncing}
        activeOpacity={0.8}
      >
        {syncing ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={s.syncText}> Yuborilmoqda...</Text>
          </>
        ) : (
          <Text style={s.syncText}>↑  Ma&apos;lumotlarni serverga yuborish</Text>
        )}
      </TouchableOpacity>

      {/* Status box */}
      <View style={s.infoBox}>
        <Text style={s.infoTitle}>⚙️  Tizim</Text>
        <InfoLine label="Server"          value="138.249.7.176:8000" />
        <InfoLine label="Sinxronizatsiya" value="Har 30 soniyada" />
        <InfoLine label="Fon rejim"       value="Yoqilgan ✓" />
      </View>

      {/* Logs */}
      {logs.length > 0 && (
        <View style={s.logBox}>
          <Text style={s.logTitle}>📋  Faollik</Text>
          {logs.map((l, i) => (
            <Text key={i} style={s.logLine}>{l}</Text>
          ))}
        </View>
      )}

      <Text style={s.note}>
        Admin qurilmangizni bloklasa — ekran avtomatik bloklanadi.{'\n'}
        Unblock berilsa — normal holat qaytadi.
      </Text>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={s.logoutText}>⏻  Hisobdan chiqish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({
  icon, label, value,
}: {
  icon: string; label: string; value: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 }}>
      <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{icon}</Text>
      <Text style={{ fontSize: 12, color: C.muted, width: 88 }}>{label}</Text>
      <Text
        style={{ fontSize: 13, color: C.white, fontWeight: '600', flex: 1 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Sep() {
  return <View style={{ height: 1, backgroundColor: C.border, marginLeft: 36 }} />;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}
    >
      <Text style={{ fontSize: 12, color: C.muted }}>{label}</Text>
      <Text style={{ fontSize: 12, color: C.white, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  hi:         { fontSize: 13, color: C.muted },
  name:       { fontSize: 22, fontWeight: '800', color: C.white },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
  },
  syncBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    marginBottom: 14, gap: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  syncText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoBox: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: C.white, marginBottom: 4 },
  logBox: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
  },
  logTitle:   { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8 },
  logLine:    { fontSize: 11, color: C.muted, marginBottom: 3 },
  note:       { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 17, marginBottom: 24 },
  logoutBtn: {
    padding: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(200,50,50,0.3)',
    backgroundColor: 'rgba(139,0,0,0.12)',
  },
  logoutText: { color: '#ff7777', fontSize: 14, fontWeight: '600' },
});
