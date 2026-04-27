import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export const ProductsTabIcon = ({ size = 24, color = '#2C3541' }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
  
    <Path
      d="M8 16 L32 4 L56 16 L56 48 L8 48 Z
         M8 16 L32 28 L56 16"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Path
      d="M20 36 L28 44 L44 28"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
