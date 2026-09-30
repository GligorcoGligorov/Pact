import * as Device from 'expo-device'
import * as ImagePicker from 'expo-image-picker'

/**
 * The check-in's proof photo: taken with the camera, never picked from the library, so it shows
 * today and not last week.
 *
 * The iOS simulator has no camera. In a development build on a simulator only, the photo comes
 * from the library instead, so the flow can be demoed there. `__DEV__` is false in every release
 * build and Metro folds this branch away, so a shipped app can only ever use the camera.
 */
export const USES_SIMULATOR_LIBRARY_FALLBACK = __DEV__ && !Device.isDevice

const OPTIONS: ImagePicker.ImagePickerOptions = {
	mediaTypes: ['images'],
	quality: 0.7,
	exif: false
}

export type ProofPhotoResult =
	| { status: 'taken'; asset: ImagePicker.ImagePickerAsset }
	| { status: 'cancelled' }
	| { status: 'no_permission' }

export async function takeProofPhoto(): Promise<ProofPhotoResult> {
	if (USES_SIMULATOR_LIBRARY_FALLBACK) {
		// The system photo picker needs no permission.
		const picked = await ImagePicker.launchImageLibraryAsync(OPTIONS)
		return picked.canceled ? { status: 'cancelled' } : { status: 'taken', asset: picked.assets[0] }
	}

	const permission = await ImagePicker.requestCameraPermissionsAsync()
	if (!permission.granted) return { status: 'no_permission' }
	const taken = await ImagePicker.launchCameraAsync(OPTIONS)
	return taken.canceled ? { status: 'cancelled' } : { status: 'taken', asset: taken.assets[0] }
}
