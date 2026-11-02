import { TIME_SCALES } from '../game/useSim';
import { Segmented } from './Segmented';

/** Sim speed segmented control: ×1 ×2 ×4 ×8, each 46×44. */
export function SpeedControl({ value, onChange }: { value: number; onChange: (s: number) => void }) {
  return (
    <Segmented
      options={TIME_SCALES.map((s) => ({ value: s, label: `×${s}`, a11y: `Sim speed times ${s}`, testID: `speed-${s}` }))}
      value={value}
      onChange={onChange}
      segmentWidth={46}
      label="Sim speed"
    />
  );
}
