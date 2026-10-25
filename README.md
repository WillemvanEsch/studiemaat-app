# Studiemaat-app

iOS- en Android-app van [Studiemaat](https://www.studiemaat.nl), gebouwd met Expo (React Native).
De app praat met de website via `https://www.studiemaat.nl/api/v1/mobile/*`.

```bash
npm install
cp .env.example .env    # EXPO_PUBLIC_API_BASE_URL invullen
npm start               # met een development build (eas build --profile development)
```

Zie `CLAUDE.md` voor opzet, afspraken en hoe je een update uitbrengt.
