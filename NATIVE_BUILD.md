# Z1 INSIGHTS — Native iOS & Android Build Guide

Your Capacitor configuration, icons, and splash screen are ready. To produce
App Store and Google Play binaries you need to run a few commands on your own
computer (Lovable's sandbox cannot run Xcode / Android Studio).

## 1. Export & install

```bash
# Export this project to GitHub via the Lovable “Export to GitHub” button, then:
git clone <your-repo>
cd <your-repo>
npm install            # or: bun install
```

## 2. Generate platform icons & splash from resources/

The brand assets live in `resources/icon.png` (1024×1024) and
`resources/splash.png` (1920×1920). Run:

```bash
npx capacitor-assets generate --iconBackgroundColor "#0A0A0B" --splashBackgroundColor "#0A0A0B"
```

This emits every iOS app-icon size, every Android adaptive-icon density,
and splash screens for both platforms.

## 3. Add the native projects

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

## 4. Run on a simulator / device

```bash
npx cap run ios        # requires macOS + Xcode
npx cap run android    # requires Android Studio
```

## 5. Submit to the stores

### iOS — App Store Connect

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Set your **Apple Team** and bump **Build / Version**.
3. Product → **Archive**, then **Distribute App → App Store Connect**.
4. Fill in App Store metadata using the copy in `STORE_LISTING.md`.

### Android — Google Play Console

1. In `android/`, set `versionCode` and `versionName` in
   `android/app/build.gradle`.
2. Build a release bundle:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
3. The signed `.aab` lives in
   `android/app/build/outputs/bundle/release/app-release.aab`.
4. Upload it through the Play Console, paste the listing from
   `STORE_LISTING.md`.

## Notes

- **Bundle / App ID**: `com.z1insights.app` (set in `capacitor.config.ts`).
- **Min iOS**: 14 (Capacitor 8 default). **Min Android**: API 24.
- The app uses `BrowserRouter`. Capacitor serves the static `dist/` build,
  so all navigation works without server changes.
- `server.url` in `capacitor.config.ts` is commented out so production
  binaries are fully offline-capable. Uncomment it for hot-reload during
  development.
- Stripe Checkout in native: the embedded checkout opens in the in-app
  webview. When you go live, set `Apple Pay` in Stripe and add the
  associated domain entitlement in Xcode for the smoothest experience.