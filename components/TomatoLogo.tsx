import * as React from 'react';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

export const TomatoLogo = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
 
    <Circle cx="50" cy="55" r="38" fill="#E74C3C" stroke="#333" strokeWidth="4" />

    <Path
      d="M50 20 C45 15, 35 10, 30 20 C25 30, 40 25, 45 30 C50 35, 55 25, 60 20 C65 15, 55 10, 50 20 Z"
      fill="#8BC34A"
      stroke="#333"
      strokeWidth="3"
    />

    <Ellipse cx="40" cy="60" rx="3" ry="4" fill="#333" />
    <Ellipse cx="60" cy="60" rx="3" ry="4" fill="#333" />

    <Path
      d="M40 68 Q50 78, 60 68"
      stroke="#333"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);