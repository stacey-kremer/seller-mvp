import * as React from 'react'
import Svg, { Path, Rect } from 'react-native-svg'

export const StoreIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">

    <Rect x="8" y="24" width="48" height="32" stroke={color} strokeWidth="2" fill="none" />

    <Path
      d="M8 24 L16 16 H48 L56 24"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <Path
      d="M16 24 C18 20, 22 20, 24 24 S28 28, 32 24 S36 20, 40 24 S44 28, 48 24"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <Rect x="44" y="36" width="8" height="20" stroke={color} strokeWidth="2" fill="none" />

    <Rect x="16" y="36" width="16" height="12" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
)