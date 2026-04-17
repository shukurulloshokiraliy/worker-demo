# Worker Security — v5 (Expo SDK 54)

O'quvchi qurilmalarini monitoring qiluvchi React Native Expo ilovasi.

## Xususiyatlar

- **Register** — Ism/sinf/telefon bilan ro'yxatdan o'tish, avtomatik username/password yaratish, JWT token
- **Home** — Profil, server status (online/offline), har 30 soniyada heartbeat
- **Block** — Server `is_blocked=true` qaytarsa qurilmani bloklaydi (BackHandler bloklangan, pulse/scan animatsiya, vibration)
- **Background Sync** — `expo-background-task` (WorkManager on Android, BGTaskScheduler on iOS), 15 daqiqada bir marta
- **Notifications** — Blok va unblock holatlari uchun local notifikatsiyalar

## Texnik stek

- Expo SDK 54 (New Architecture yoqilgan)
- Expo Router v6
- React Native 0.81.5 + React 19
- TypeScript
- Zustand (state management)
- Axios (API)
- expo-secure-store (token/profil saqlash)
- expo-background-task (fon vazifalari — `expo-background-fetch` o'rniga)
- expo-notifications (yangi `shouldShowBanner`/`shouldShowList` API)

## Server

Server URL: `http://138.249.7.176:8000`

O'zgartirish uchun: `src/utils/constants.ts` dagi `BASE_URL`.

## O'rnatish

```bash
npm install
npx expo start
```

## Android Build

```bash
# Preview (APK)
npm run build:preview

# Production (AAB)
npm run build:prod
```

EAS projectId allaqachon `app.json` da sozlangan.

## Loyiha strukturasi

```
.
├── app/
│   ├── _layout.tsx          # Root layout — Zustand state asosida screen tanlash
│   └── index.tsx            # Entry point (re-exports _layout)
├── src/
│   ├── api/
│   │   └── index.ts         # Axios client — login/register/devices
│   ├── screens/
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── BlockScreen.tsx
│   ├── services/
│   │   └── SyncService.ts   # Background task + notifications + heartbeat
│   ├── store/
│   │   └── index.ts         # Zustand store (profile, isBlocked, lastSync)
│   └── utils/
│       ├── colors.ts        # Design tokens
│       └── constants.ts     # Storage keys, BASE_URL, task name
├── assets/images/           # Iconlar va splash
├── app.json
├── eas.json
└── package.json
```

## v4 dan farqlar (muhim o'zgarishlar)

1. **`expo-background-fetch` → `expo-background-task`** — SDK 53+ da `expo-background-fetch` deprecated, SDK 54 da `expo-background-task` tavsiya etiladi (WorkManager/BGTaskScheduler)
2. **`Notifications.setNotificationHandler`** yangi API — `shouldShowAlert` olib tashlangan, o'rniga `shouldShowBanner` va `shouldShowList`
3. **Edge-to-edge Android** — `StatusBar.backgroundColor` ishlatilmaydi, `expo-status-bar` faqat `style` bilan
4. **New Architecture** — `newArchEnabled: true` (SDK 54 da standart)
5. **React 19 + RN 0.81.5** — ishlatilayotgan kutubxonalar moslashtirilgan

## Permissions (Android)

- `INTERNET`, `ACCESS_NETWORK_STATE` — API
- `POST_NOTIFICATIONS` — Blok notifikatsiyalari
- `VIBRATE` — BlockScreen vibratsiya
- `WAKE_LOCK` — BlockScreen `useKeepAwake` uchun
- `RECEIVE_BOOT_COMPLETED` — qurilma qayta yoqilgandan keyin background task davom etishi uchun
