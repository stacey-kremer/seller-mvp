import * as React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export const WalkingBagIcon = ({ size = 24, color = '#2C3541' }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">

    <Rect x="10" y="10" width="44" height="44" rx="8" fill={color} />

    <Path
      d="M20 24 C20 16, 44 16, 44 24"
      stroke="#fff"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />

    <Circle cx="26" cy="36" r="2" fill="#fff" />
    <Circle cx="38" cy="36" r="2" fill="#fff" />

    <Path
      d="M26 42 Q32 46, 38 42"
      stroke="#fff"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);