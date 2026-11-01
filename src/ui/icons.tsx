import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Lucide-style line icons at a 1.5 stroke (design: no raster assets). */
interface IconProps {
  color: string;
  size?: number;
  strokeWidth?: number;
}

const frame = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export const PauseIcon = ({ color, size = 18, strokeWidth = 1.5 }: IconProps) => (
  <Svg {...frame(size)}>
    <Rect x={6} y={4} width={4} height={16} stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Rect x={14} y={4} width={4} height={16} stroke={color} strokeWidth={strokeWidth} fill="none" />
  </Svg>
);

export const PlayIcon = ({ color, size = 18, strokeWidth = 1.5 }: IconProps) => (
  <Svg {...frame(size)}>
    <Path d="M7 4v16l13-8z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="miter" />
  </Svg>
);

export const CheckIcon = ({ color, size = 15, strokeWidth = 2 }: IconProps) => (
  <Svg {...frame(size)}>
    <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={strokeWidth} fill="none" />
  </Svg>
);

export const WarningIcon = ({ color, size = 15, strokeWidth = 1.75 }: IconProps) => (
  <Svg {...frame(size)}>
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Path d="M12 9v4M12 17h.01" stroke={color} strokeWidth={strokeWidth} fill="none" />
  </Svg>
);

export const CrosshairIcon = ({ color, size = 20, strokeWidth = 1.5 }: IconProps) => (
  <Svg {...frame(size)}>
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const CloseIcon = ({ color, size = 20, strokeWidth = 1.5 }: IconProps) => (
  <Svg {...frame(size)}>
    <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const RestartIcon = ({ color, size = 18, strokeWidth = 1.5 }: IconProps) => (
  <Svg {...frame(size)}>
    <Path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" stroke={color} strokeWidth={strokeWidth} fill="none" />
  </Svg>
);

const chevron = (d: string) =>
  function Chevron({ color, size = 22, strokeWidth = 1.75 }: IconProps) {
    return (
      <Svg {...frame(size)}>
        <Path d={d} stroke={color} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  };
export const ChevronLeft = chevron('m15 18-6-6 6-6');
export const ChevronRight = chevron('m9 18 6-6-6-6');
export const ChevronDown = chevron('m6 9 6 6 6-6');
export const ChevronUp = chevron('m18 15-6-6-6 6');
