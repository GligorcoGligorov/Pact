import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { SIGNATURE_BOX } from '@app/contract'

/** A stored signature, drawn at any width in its box's proportions. */
export function Signature({ path, ink, width }: { path: string; ink: string; width: number }) {
	return (
		<View style={{ width, aspectRatio: SIGNATURE_BOX.width / SIGNATURE_BOX.height }}>
			<Svg
				width="100%"
				height="100%"
				viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
			>
				<Path
					d={path}
					stroke={ink}
					strokeWidth={2.6}
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</Svg>
		</View>
	)
}
