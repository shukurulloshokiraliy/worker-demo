import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
  BackHandler, Vibration,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useStore } from '../store';

export default function BlockScreen() {
  useKeepAwake();
  const { profile } = useStore();

  const pulse  = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scanY  = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Scan line
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 300,  duration: 2500, useNativeDriver: true }),
        Animated.timing(scanY, { toValue: -300, duration: 0,    useNativeDriver: true }),
      ])
    );
    scanLoop.start();

    // Vibrate
    try {
      Vibration.vibrate([0, 400, 200, 400, 200, 600]);
    } catch {}

    // Back button blocked (Android)
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      pulseLoop.stop();
      scanLoop.stop();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: fadeIn }]}>
      <StatusBar style="light" />

      {/* Scan line */}
      <Animated.View style={[s.scan, { transform: [{ translateY: scanY }] }]} />

      <View style={s.content}>
        {/* Lock icon */}
        <Animated.View style={[s.circle, { transform: [{ scale: pulse }] }]}>
          <Text style={s.lock}>🔒</Text>
        </Animated.View>

        <Text style={s.title}>QURILMA{'\n'}BLOKLANDI</Text>
        <Text style={s.sub}>DEVICE BLOCKED</Text>

        <View style={s.line} />

        <Text style={s.desc}>
          Bu qurilma maktab ma&apos;muriyati tomonidan{'\n'}vaqtincha cheklangan
        </Text>

        {/* Student info */}
        {profile && (
          <View style={s.infoCard}>
            <IRow icon="👤" label="O'quvchi" value={profile.fullName} />
            <View style={s.sep} />
            <IRow icon="🏫" label="Sinf"     value={profile.className} />
            <View style={s.sep} />
            <IRow icon="📱" label="Telefon"  value={profile.phone} />
          </View>
        )}

        {/* Warning */}
        <View style={s.warn}>
          <Text style={s.warnIcon}>⚠️</Text>
          <Text style={s.warnText}>
            Bloklash olib tashlanmaguncha bu ekrandan chiqib bo&apos;lmaydi
          </Text>
        </View>

        <Text style={s.foot}>
          Muammo bo&apos;lsa o&apos;qituvchi yoki ma&apos;muriyatga murojaat qiling
        </Text>
      </View>
    </Animated.View>
  );
}

function IRow({
  icon, label, value,
}: {
  icon: string; label: string; value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 7,
      }}
    >
      <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{icon}</Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: '#FF444477',
          width: 78,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFAAAA', flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

const RED = '#CC1111';

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#080000',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  scan: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: RED, opacity: 0.25,
  },
  content:  { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  circle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(204,17,17,0.15)',
    borderWidth: 2, borderColor: RED + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: RED, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 30, elevation: 20,
  },
  lock: { fontSize: 56 },
  title: {
    fontSize: 28, fontWeight: '900', color: '#FF3333',
    letterSpacing: 3, textAlign: 'center', lineHeight: 34, marginBottom: 6,
  },
  sub: {
    fontSize: 11, fontWeight: '700', color: '#FF333355',
    letterSpacing: 5, textAlign: 'center', marginBottom: 20,
  },
  line: {
    width: 50, height: 2, backgroundColor: RED + '55',
    borderRadius: 1, marginBottom: 16,
  },
  desc: {
    fontSize: 14, color: '#FF888877', textAlign: 'center',
    lineHeight: 22, marginBottom: 20,
  },
  infoCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: RED + '22', marginBottom: 18,
  },
  sep: { height: 1, backgroundColor: RED + '15', marginLeft: 36 },
  warn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: RED + '10', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: RED + '28', marginBottom: 18, width: '100%',
  },
  warnIcon: { fontSize: 18 },
  warnText: { color: '#FF7777', fontSize: 13, lineHeight: 20, flex: 1 },
  foot: {
    fontSize: 11, color: '#FF333333', textAlign: 'center', lineHeight: 17,
  },
});
