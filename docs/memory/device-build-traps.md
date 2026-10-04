---
name: device-build-traps
description: Traps hit getting Pact's local dev build running (free Apple ID, Xcode 16.2 on macOS 14, OTP email, CocoaPods)
metadata:
  type: project
---

Found in Phase 0 (2026-09-30). Each one cost time once; don't rediscover them.

- **Free Apple ID can't sign `aps-environment` or `com.apple.developer.applesignin`.** Build with
  `PACT_LOCAL_SIGNING=1`; `apps/mobile/app.config.ts` strips both. The strip is applied to the
  returned config, not added to `plugins`: config-plugin mods run newest-registered first, so it
  must register before app.json's plugins to run after expo-notifications adds
  `aps-environment`. Check with `PACT_LOCAL_SIGNING=1 npx expo config --type introspect`.
- **The local stack's default emails carry a link, not a code.** The app's login asks for six
  digits, so `supabase/config.toml` points the `confirmation` and `magic_link` templates at
  `supabase/templates/sign-in-code.html` (`{{ .Token }}`). A config change needs
  `supabase stop && supabase start`.
- **Expo SDK 55 does not compile with Xcode 16.2 (found 2026-09-30).** `expo-modules-core` uses
  isolated conformances (`@MainActor AnyExpoSwiftUIHostingView`), a Swift 6.2 feature; Xcode
  16.2 has Swift 6.0.3 and fails with `unknown attribute 'MainActor'`. Swift 6.2 is Xcode 26,
  which needs macOS 15.6+. This blocks every local iOS build, simulator and device alike. The
  way round it: an EAS cloud build, `--profile simulator`, installed with `xcrun simctl install`.
  The first Metro bundle takes about 40 s and the dev client times out first ("Error loading
  app"): tap OK and reload.
- **This Mac is macOS 14 (Sonoma) with Xcode 16.2.** Xcode 16.3+ needs macOS 15, so a newer
  Xcode for iOS 18.5 means an OS upgrade first. Not worth it before a demo: use the simulator.
- **CocoaPods: don't let Expo install it.** System Ruby 2.6 can't: its native extensions don't
  compile against Xcode 16.2's SDK. Expo's Homebrew fallback is worse: Homebrew has no macOS 14
  bottle for `ruby`, so it compiles Rust and LLVM from source (hours; killed after one). What
  works: `brew install ruby-build`, `ruby-build 3.3.12 ~/.rubies/ruby-3.3.12` (a few minutes,
  C only), `~/.rubies/ruby-3.3.12/bin/gem install cocoapods`, then build with
  `PATH="$HOME/.rubies/ruby-3.3.12/bin:$PATH" LANG=en_US.UTF-8`.
- **Xcode 16.2 needs its iOS 18.2 platform installed**, or `xcodebuild` finds no destination at
  all ("iOS 18.2 is not installed"): not the simulators, not the phone. Only the 18.1 simulator
  runtime was on this Mac. `xcodebuild -downloadPlatform iOS` (about 8 GB; mind the disk).
- **The phone must be unlocked and on the cable** for CoreDevice to see it. Otherwise
  `xcrun devicectl list devices` says `unavailable`, even when paired with Developer Mode on.
- **Preparing the phone can make this Mac unusable** (Xcode copying symbols for a new iOS
  version). The developer unplugged it on 2026-09-30; the trial runs on the simulator.
- A free-team install expires after 7 days: rebuild before a demo that's more than a week later.
- **Simulator only, so the app talks to `127.0.0.1` (2026-10-04):** the LAN address in the
  `.env.local` files (`EXPO_PUBLIC_SITE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL`)
  broke the app every time the Mac changed network (192.168.1.215 → a hotspot's 172.20.10.4: every
  request timed out). The simulator shares the Mac's network, so `127.0.0.1` always works. Back to
  a real phone: switch those three to the Mac's LAN address again and start Metro with `--clear`
  (Expo bakes `EXPO_PUBLIC_*` into the bundle, and Metro's cache keeps the old one).

See [[trial-local-only]] and docs/ENV_SETUP.md, "Running Pact locally".
