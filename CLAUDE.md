# studiemaat-app — iOS- en Android-app van Studiemaat

Expo / React Native-app voor Studiemaat (studiemaat.nl): foto's van lesstof maken, uittreksel, begrippen en
flitskaarten bekijken, overhoren (ook hardop) en proeftoetsen met cijfer. Alle tekst voor gebruikers is Nederlands.
Eigenaar: Wim (Media Solutions B.V.).

De app heeft **geen eigen database**. Alles gaat via de website-backend (repo `WillemvanEsch/studypro`) en zijn
JSON-routes onder `https://studiemaat.nl/api/v1/mobile/*`. Zie de sectie "Koppeling voor de app" in de
`CLAUDE.md` van studypro voor de routes en de regels daar.

Opzet is bewust gelijk aan de bieden.nl-app (`MediaSolutionsBV/bieden-app`): zelfde stack, mappen, API-laag,
iconen-wrapper, push en versie-check. Bij twijfel daar kijken hoe het is opgelost.

`AGENTS.md`: Expo 56 heeft nieuwe API's, lees https://docs.expo.dev/versions/v56.0.0/ voor je Expo-code schrijft.

## Werkafspraken

- **Live data.** De app praat met de echte website en database: elk account is een echte leerling. Test met een
  eigen testaccount, nooit met dat van Elizabeth (eerste gebruiker).
- **`/api/v1/mobile/*` is een contract** met apps die al op telefoons staan. Velden nooit weghalen of van betekenis
  veranderen; voor brekende wijzigingen komt er `/api/v2/mobile/*`.
- Geen sleutels of tokens in bestanden of commits. `EXPO_PUBLIC_*` komt in de app (dus nooit iets geheims);
  waarden staan in EAS (environment variables per profiel) en lokaal in `.env` (gitignored).
- Commentaar in de code is Nederlands en uitleggend.
- **Geen analytics of advertentie-SDK's** (geen Firebase Analytics, Meta, GA): de doelgroep begint bij groep 7
  (kinderen onder 13), dan gelden de Families-regels van Google en Apple's Kids-regels. Alleen Sentry voor crashes.
- Nieuwe native dependency = nieuwe EAS-build (zie "Updates"). Vraag Wim bij nieuwe packages.

## Stack

- Expo SDK 56, Expo Router (bestanden in `src/app/`), React 19.2, React Native 0.85, TypeScript strict.
- TanStack Query v5 voor serverdata (`staleTime` 30 s, `retry` 1).
- `expo-secure-store` voor het sessietoken (Keychain/Keystore), via `src/lib/storage.ts`.
- `expo-image-picker` + `expo-image-manipulator` voor foto's (verkleind tot max 2000 px, JPEG 70%, ruim onder de
  4 MB per upload die Vercel toestaat).
- `expo-speech-recognition` (hardop antwoorden, taal van de vraag) en `expo-speech` (vraag voorlezen).
- `expo-notifications` voor push via Expo Push Service (APNs + FCM).
- `expo-iap` (5.8.3) voor abonnementen via Apple/Google.
- `@sentry/react-native` voor crashes (alleen met `EXPO_PUBLIC_SENTRY_DSN`, niet in `__DEV__`). Uploaden van source maps
  staat uit (`SENTRY_DISABLE_AUTO_UPLOAD` in `eas.json`) tot er een Sentry-project is; anders faalt de iOS-build met
  "An organization ID or slug is required". Aanzetten: organisatie/project in de Sentry-plugin in `app.json` en
  `SENTRY_AUTH_TOKEN` als geheim in EAS, dan de regel uit `eas.json` halen.
- `expo-updates` voor OTA-updates (`runtimeVersion.policy = appVersion`).
- Geen Tailwind/NativeWind: kleuren en maten uit `src/constants/theme.ts` via `useTheme()`. Nooit een hex in een
  component.

## Mappen

- `src/app/` — schermen (Expo Router)
  - `_layout.tsx` — Sentry, QueryClient, AuthProvider, Stack, VersionGate
  - `index.tsx` — doorsturen naar inloggen of de tabs
  - `(auth)/login.tsx` — mailadres → 6-cijferige code
  - `(tabs)/` — `index` (lessen), `nieuw` (foto's → nieuwe les), `toetsen`, `ik/` (stack: account, `instellingen`,
    `abonnement`, `uitnodigen`, `verwijderen`)
  - `les/[id].tsx` — uittreksel, begrippen, flitskaarten, foto's, oefenen/proeftoets starten
  - `toets/[id].tsx` — overhoren en proeftoetsen, resultaat met cijfer
- `src/api/` — alle calls naar de website. Componenten importeren uit `@/api`, nooit `fetch` in een scherm.
  `types.ts` spiegelt wat de website teruggeeft.
- `src/contexts/auth-context.tsx` — `useAuth()`: status, `me`, inloggen, uitloggen.
- `src/lib/` — `storage` (SecureStore), `push-notifications`, `purchases`, `photos`, `version`, `sentry`, `format`.
- `src/components/` — `ui.tsx` (Screen, Card, Button, Field, Notice, Chips…), `icon.tsx`, `rich-text.tsx`,
  `flashcards.tsx`, `app-tabs.tsx`, `version-gate.tsx`.

## Inloggen

Zelfde mailcode als de website, maar zonder cookies:
1. De app maakt per poging een willekeurig `loginSecret` (SecureStore) en stuurt dat mee met
   `POST /mobile/auth/code`. De code werkt alleen samen met dat geheim (zoals de `sp_login`-cookie op de site).
2. `POST /mobile/auth/verify` geeft een sessietoken (zelfde `sessions`-tabel, `client = 'app'`).
3. Dat token gaat als `Authorization: Bearer` mee met elke call. Een 401 = uitgelogd (sessie weg of account
   verwijderd); `setUnauthorizedHandler` zet de app dan terug naar inloggen.
4. Elke call stuurt ook `x-studiemaat-device` (vaste id per installatie) mee, voor de misbruikcontrole.

Testaccount voor Apple/Google-review: `APP_REVIEW_EMAIL` + `APP_REVIEW_CODE` in Vercel; daarvoor wordt geen mail
verstuurd. Geef dat account in Beheer "Altijd gratis".

## Toegang en abonnementen

- `me.access.hasAccess` bepaalt of je nieuwe lessen en toetsen mag maken; de website antwoordt anders met 402.
  Lessen bekijken kan altijd.
- **Besloten (25 okt 2026):** in de app worden abonnementen verkocht via Apple/Google (in-app aankopen, automatisch
  verlengend, ook maandelijks). Pay.nl blijft alleen op de website. Wie op de website betaalde, logt gewoon in.
- **De app verwijst nooit naar de website om te betalen** (geen links, knoppen of teksten als "koop op
  studiemaat.nl"); anders gelden Apple's link-out-regels en -kosten.
- In-app aankopen: **zelf gebouwd** (Wim, 25 okt 2026: geen RevenueCat) met `expo-iap` (vastgezet op 5.8.3), in
  `src/lib/purchases.ts`. Producten `studiemaat_maand`, `studiemaat_kwartaal`, `studiemaat_jaar` (codes komen van
  `/mobile/store`, prijzen van de winkel zelf). Bij een aankoop gaat `accountId` mee (iOS `appAccountToken`, Android
  `obfuscatedAccountId`). Na de aankoop melden we hem aan de website (`/mobile/store/purchase`), die hem bij
  Apple/Google controleert; pas daarna `finishTransaction`. Bij een storing niet afronden: de winkel biedt hem bij de
  volgende start opnieuw aan (luisteren start in `auth-context` zodra je bent ingelogd).
- `ik/abonnement`: status, abonnementen kopen (alleen als je geen doorlopend winkelabonnement hebt), "Aankopen
  herstellen" (verplicht bij Apple), "Abonnement beheren" (instellingen van de telefoon), en de verplichte tekst over
  automatisch verlengen met links naar gebruiksvoorwaarden en privacy.
- Testen kan alleen op een echt toestel met een development/preview-build: iOS met een sandbox-account
  (App Store Connect → Gebruikers en toegang → Sandbox), Android met een licentietester in Play Console en de app in
  een testtrack. Sandbox-aankopen geven op de website ook toegang (notitie "(test)").

## Push

- `src/lib/push-notifications.ts`: toestemming, token ophalen, registreren via `/mobile/push/register`.
  Registreren na inloggen en bij elke start; afmelden vóór uitloggen.
- De website stuurt `data.url` als webpad (`/les/12`, `/toets/34`); `routeFromUrl()` zet dat om naar een scherm.
- Eerste melding: "Je les is klaar" na het verwerken van foto's.
- Android heeft de FCM V1-sleutel in EAS nodig (`eas credentials` → Android → FCM V1). Simulator krijgt geen token.

## Versie-check

`/mobile/version-check` geeft `minSupported` en `recommended` (Vercel-env `EXPO_MIN_SUPPORTED_VERSION`,
`EXPO_RECOMMENDED_VERSION`, `EXPO_UPGRADE_MESSAGE`). Lager dan minimaal = scherm "update nodig", lager dan
aanbevolen = balk bovenin. `APP_STORE_URL` in `src/lib/version.ts` moet het echte App Store-id krijgen zodra dat er is.

## Store-eisen (niet vergeten)

- Account verwijderen in de app (`ik/verwijderen`). Lukt het niet meteen (betaald, eerste account, beheerder),
  dan krijgt de beheerder een verzoek.
- Toestemming vóór het eerste versturen van foto's naar de AI (Apple 5.1.2(i)), in `(tabs)/nieuw.tsx`.
- Reviewer-testaccount (zie Inloggen).
- Google Play: doelgroep inclusief kinderen onder 13 → Families-beleid, geen advertenties/analytics.
- "Aankopen herstellen"-knop en de tekst over automatisch verlengen staan in `ik/abonnement`.

## Commando's

- Inloggen bij Expo: Wim gebruikt een Google-account (geen wachtwoord), dus `eas login --device` (link + code, inloggen in
  de browser). Controleren met `eas whoami`.
- `npm start` — Metro voor de dev build (`--dev-client`; Expo Go werkt niet met onze native modules)
- `npm run ios` / `npm run android`
- `npm run lint` — `expo lint`
- `npm run typecheck` — `tsc --noEmit`

## Updates — welke route?

Zelfde drie routes als bij bieden.nl:
- **A. Alleen de website** (studypro) → push naar main → Vercel. Kan alles zolang het API-contract heel blijft.
- **B. Alleen JS/TS in `src/`** → `eas update --branch production --message "..."`. Alle telefoons met dezelfde
  `version` krijgen het bij de volgende start. Eerst testen via `--branch preview`.
- **C. Native** (nieuw native package, `app.json` native delen, versie ophogen) → `eas build --profile production`
  + `eas submit` + review bij Apple/Google.
Bij twijfel: C.

## Eerste keer instellen (nog te doen, okt 2026)

- Expo-project gekoppeld (25 okt 2026): projectId `decc02c6-9399-4684-bdde-529bbe739cb2`, slug `studiemaat`, staat in `app.json`.
- App Store Connect: app `nl.studiemaat.app` aanmaken; Play Console: app `nl.studiemaat.app` aanmaken.
- EAS env: `EXPO_PUBLIC_API_BASE_URL=https://studiemaat.nl/api/v1`, `EXPO_PUBLIC_SENTRY_DSN`.
- Vercel (studypro): `APP_REVIEW_EMAIL`, `APP_REVIEW_CODE`; firewall-uitzondering voor `/api/v1/mobile/*` als
  bot-bescherming aan staat.
