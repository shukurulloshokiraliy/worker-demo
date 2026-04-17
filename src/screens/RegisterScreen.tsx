import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Application from 'expo-application';
import { apiRegister, apiLogin } from '../api';
import { useStore } from '../store';
import { C } from '../utils/colors';
import { STORAGE } from '../utils/constants';
import { storageSet } from '../utils/storage';

export default function RegisterScreen() {
  const { setProfile } = useStore();
  const [fullName,  setFullName]  = useState('');
  const [className, setClassName] = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);

  async function handleRegister() {
    const name = fullName.trim();
    const cls  = className.trim();
    const ph   = phone.trim();

    if (!name)         return Alert.alert('⚠️ Xato', 'Ism familiyangizni kiriting');
    if (!cls)          return Alert.alert('⚠️ Xato', 'Sinf raqamini kiriting (masalan: 9-A)');
    if (ph.length < 9) return Alert.alert('⚠️ Xato', "To'g'ri telefon raqam kiriting");

    setLoading(true);
    try {
      // Device ID (Android) yoki fallback
      let androidId: string | null = null;
      try {
        androidId = Application.getAndroidId();
      } catch {
        androidId = null;
      }
      const deviceId = androidId || `dev_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const suffix   = deviceId.slice(-6);
      const username = `w_${suffix}_${Date.now().toString(36)}`;
      const password = `Wp_${deviceId.slice(-10)}!`;

      // 1. Serverga ro'yxatdan o'tish
      const user = await apiRegister({
        username,
        password,
        full_name:  name,
        class_name: cls,
        phone:      ph,
        role:       'worker',
      });

      // 2. Token olish
      await apiLogin(username, password);

      // 3. Local saqlash
      const profile = {
        userId:    String(user?.id ?? username),
        username,
        fullName:  name,
        className: cls,
        phone:     ph,
        deviceId,
      };

      await Promise.all([
        storageSet(STORAGE.profile,  JSON.stringify(profile)),
        storageSet(STORAGE.deviceId, deviceId),
        storageSet(STORAGE.blocked,  'false'),
      ]);

      setProfile(profile);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        "Server bilan bog'lanishda xato";
      Alert.alert('❌ Xato', String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Text style={s.logoIcon}>🔐</Text>
          </View>
          <Text style={s.appName}>Worker Security</Text>
          <Text style={s.appSub}>O&apos;quvchi monitoring tizimi</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Ro&apos;yxatdan o&apos;tish</Text>
          <Text style={s.cardDesc}>
            Qurilmangizni tizimga ulash uchun{'\n'}ma&apos;lumotlaringizni kiriting
          </Text>

          <Label text="👤  Ism Familiya *" />
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Masalan: Abdullayev Ali"
            placeholderTextColor={C.ph}
            autoCapitalize="words"
            editable={!loading}
          />

          <Label text="🏫  Sinf *" />
          <TextInput
            style={s.input}
            value={className}
            onChangeText={setClassName}
            placeholder="Masalan: 9-A yoki 11-B"
            placeholderTextColor={C.ph}
            autoCapitalize="characters"
            editable={!loading}
          />

          <Label text="📱  Telefon raqami *" />
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+998 90 123 45 67"
            placeholderTextColor={C.ph}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Davom etish →</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>
          Ushbu ilova maktab ma&apos;muriyati tomonidan boshqariladi
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: C.accent,
        marginBottom: 6,
        marginTop: 14,
        letterSpacing: 0.6,
      }}
    >
      {text}
    </Text>
  );
}

const s = StyleSheet.create({
  scroll:     { flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: 'center' },
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(139,0,0,0.3)',
    borderWidth: 2, borderColor: 'rgba(200,150,46,0.5)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#8B0000', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 10,
  },
  logoIcon:  { fontSize: 44 },
  appName:   { fontSize: 26, fontWeight: '800', color: C.white },
  appSub:    { fontSize: 13, color: C.muted, marginTop: 4 },
  card: {
    backgroundColor: C.card, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.white, marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: C.muted, lineHeight: 20 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    color: C.white, fontSize: 15,
  },
  btn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:  { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
