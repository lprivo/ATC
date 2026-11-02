import type { Meta, StoryObj } from '@storybook/react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { conflict, idle, lastMinute } from '../game/fixtures';
import { conflictBanner, type Toast } from '../game/hud';
import { useTheme } from '../theme/ThemeContext';
import { AppIcon } from './AppIcon';
import { ComingSoonTag } from './ComingSoonTag';
import { ConfirmCard } from './ConfirmCard';
import { ConflictBanner } from './ConflictBanner';
import { DifficultyBars } from './DifficultyBars';
import { ChevronDown, ChevronUp } from './icons';
import { RunwayPreview } from './RunwayPreview';
import { Segmented } from './Segmented';
import { SpeedControl } from './SpeedControl';
import { Stepper } from './Stepper';
import { Toasts } from './Toasts';
import { Toggle } from './Toggle';
import { TopBar } from './TopBar';
import { UnlockOffer } from './UnlockOffer';

const noop = () => {};

/** A themed background with padding, so a component is seen as it would be in the app. */
function Stage({ children, fill }: { children: ReactNode; fill?: boolean }) {
  const { theme } = useTheme();
  return <View style={[styles.stage, fill && styles.fill, { backgroundColor: theme.colors.background }]}>{children}</View>;
}

const meta = { title: 'Components' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const TopBarTimed: Story = { name: 'Top bar · timed', render: () => <Stage><TopBar sim={idle()} paused={false} onTogglePause={noop} sessionSec={1800} toCome={6} /></Stage> };
export const TopBarLastMinute: Story = { name: 'Top bar · last minute, separation lost', render: () => <Stage><TopBar sim={lastMinute()} paused={false} onTogglePause={noop} sessionSec={1800} toCome={0} /></Stage> };
export const TopBarEndless: Story = { name: 'Top bar · endless', render: () => <Stage><TopBar sim={idle()} paused={false} onTogglePause={noop} sessionSec={null} toCome={null} /></Stage> };

const toasts: Toast[] = [
  { seq: 1, chip: '31R', tone: 'good', text: 'WZZ8638 landed 31R', at: 0 },
  { seq: 2, chip: 'GA', tone: 'danger', text: 'LOT537 going around: too high', at: 0 },
];
export const ToastsTwo: Story = { name: 'Toasts', render: () => <Stage><Toasts toasts={toasts} /></Stage> };
export const Banner: Story = { name: 'Conflict banner', render: () => <Stage><ConflictBanner banner={conflictBanner(conflict())!} onSelect={noop} onHeight={noop} /></Stage> };
export const Confirm: Story = { name: 'Landing confirm card', render: () => <Stage><ConfirmCard callsign="WZZ8638" runway="31L" swapTo="31R" durationMs={3000} paused onSwap={noop} onConfirm={noop} /></Stage> };

function StepperDemo({ atLimit }: { atLimit?: boolean }) {
  const { theme } = useTheme();
  const icon = theme.colors.buttonText;
  return (
    <Stepper
      label="ALT FT"
      value={atLimit ? '15,000' : '7,000'}
      now="now 9,000 ↓"
      dec={{ icon: <ChevronDown color={icon} />, a11y: 'Descend 1,000 feet' }}
      inc={{ icon: <ChevronUp color={icon} />, a11y: 'Climb 1,000 feet', atLimit }}
      onStep={noop}
    />
  );
}
export const StepperNormal: Story = { name: 'Stepper', render: () => <Stage><View style={styles.third}><StepperDemo /></View></Stage> };
export const StepperAtLimit: Story = { name: 'Stepper · at its limit', render: () => <Stage><View style={styles.third}><StepperDemo atLimit /></View></Stage> };

function SegmentedDemo() {
  const [v, setV] = useState<'auto' | 'full' | 'min'>('auto');
  const [s, setS] = useState(1);
  return (
    <View style={{ gap: 16 }}>
      <Segmented label="Plane labels" options={[{ value: 'auto', label: 'Auto' }, { value: 'full', label: 'Full' }, { value: 'min', label: 'Min' }]} value={v} onChange={setV} />
      <SpeedControl value={s} onChange={setS} />
    </View>
  );
}
export const SegmentedControls: Story = { name: 'Segmented · labels, sim speed', render: () => <Stage><SegmentedDemo /></Stage> };

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <Toggle value={on} onChange={setOn} label="Sound" />
      <Toggle value={false} onChange={noop} label="Off" />
      <Toggle value={false} onChange={noop} label="Disabled" disabled />
    </View>
  );
}
export const Toggles: Story = { name: 'Toggles · on, off, disabled', render: () => <Stage><ToggleDemo /></Stage> };
export const Tags: Story = { name: 'Coming soon tag · difficulty', render: () => <Stage><View style={{ gap: 16 }}><ComingSoonTag /><DifficultyBars level={1} /><DifficultyBars level={2} /><DifficultyBars level={3} /></View></Stage> };
export const Icon: Story = { name: 'App icon', render: () => <Stage><View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}><AppIcon size={104} /><AppIcon size={60} /><AppIcon size={29} /></View></Stage> };
export const Runways: Story = { name: 'Runway preview', render: () => <Stage><RunwayPreview icao="LHBP" size={110} /></Stage> };
export const Offer: Story = { name: 'Unlock offer', render: () => <Stage fill><UnlockOffer reason="Busy traffic is in the full version" onClose={noop} bottomInset={34} /></Stage> };

const styles = StyleSheet.create({
  stage: { padding: 16, gap: 12 },
  fill: { flex: 1, justifyContent: 'flex-end', padding: 0 },
  third: { width: 120 },
});
