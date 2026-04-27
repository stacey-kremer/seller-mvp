import * as React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export const ArrivalTabIcon = ({ size = 24, color = '#2C3541' }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Rect
      x="12"
      y="16"
      width="40"
      height="36"
      rx="6"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
    <Path
      d="M22 16V10h20v6"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M32 26v14"
      stroke={color}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    <Path
      d="M25 33l7 7 7-7"
      stroke={color}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
