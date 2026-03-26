import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ScanFrameIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function ScanFrameIcon({ size = 24, color = '#FFFFFF', strokeWidth = 2.5 }: ScanFrameIconProps) {
  const s = size;
  const pad = s * 0.12;
  const corner = s * 0.28;
  const r = s * 0.08;
  const lineY = s * 0.5;
  const lineInset = s * 0.28;
  const lineGap = s * 0.06;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <Path
        d={`M${pad} ${pad + corner} V${pad + r} Q${pad} ${pad} ${pad + r} ${pad} H${pad + corner}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={`M${s - pad - corner} ${pad} H${s - pad - r} Q${s - pad} ${pad} ${s - pad} ${pad + r} V${pad + corner}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={`M${s - pad} ${s - pad - corner} V${s - pad - r} Q${s - pad} ${s - pad} ${s - pad - r} ${s - pad} H${s - pad - corner}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={`M${pad + corner} ${s - pad} H${pad + r} Q${pad} ${s - pad} ${pad} ${s - pad - r} V${s - pad - corner}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={`M${lineInset} ${lineY} H${lineY - lineGap}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d={`M${lineY + lineGap} ${lineY} H${s - lineInset}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
