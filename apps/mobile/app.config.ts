import type { ConfigContext, ExpoConfig } from 'expo/config'
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins'

/**
 * app.json is the app's config. This file only adapts it for a build signed by a free Apple ID
 * (a Personal Team), which is how the 8x trial runs: `PACT_LOCAL_SIGNING=1 npx expo run:ios`.
 *
 * A Personal Team can't sign push notifications or Sign in with Apple, and Xcode refuses the
 * whole build if either entitlement is present. So the local build drops both. Reminders are
 * local notifications (no entitlement needed) and sign-in is email OTP.
 */
const LOCAL_SIGNING = process.env.PACT_LOCAL_SIGNING === '1'

const PAID_TEAM_ENTITLEMENTS = ['aps-environment', 'com.apple.developer.applesignin']

// Applied to the returned config, so its mod registers before app.json's `plugins` are applied.
// Mods run newest-registered first, so this one runs last: after expo-notifications has added
// `aps-environment`.
const withoutPaidTeamEntitlements: ConfigPlugin = (config) =>
	withEntitlementsPlist(config, (mod) => {
		for (const key of PAID_TEAM_ENTITLEMENTS) delete mod.modResults[key]
		return mod
	})

function pluginName(plugin: NonNullable<ExpoConfig['plugins']>[number]): unknown {
	return Array.isArray(plugin) ? plugin[0] : plugin
}

export default ({ config }: ConfigContext): ExpoConfig => {
	const app = config as ExpoConfig
	if (!LOCAL_SIGNING) return app

	return withoutPaidTeamEntitlements({
		...app,
		ios: { ...app.ios, usesAppleSignIn: false },
		plugins: (app.plugins ?? []).filter(
			(plugin) => pluginName(plugin) !== 'expo-apple-authentication'
		)
	})
}
