import type { Meta, StoryObj } from '@storybook/react-native';
import { busy, conflict, idle, lastMinute } from './fixtures';
import { GameScreen } from './GameScreen';

/**
 * The game screen (design A1–A5) from prepared states (src/game/fixtures.ts):
 * the sim runs live from there unless the story starts it paused.
 */
const meta = { title: 'Game/Game screen', component: GameScreen } satisfies Meta<typeof GameScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A2: the idle scene with WZZ8638 selected (by callsign, so it doesn't depend on how the sim numbers planes). */
const idleSelected = { sim: () => idle(), selectedCallsign: 'WZZ8638' };

export const Idle: Story = { name: 'A1 · idle', args: { start: { sim: () => idle() } } };
export const Selected: Story = { name: 'A2 · plane selected', args: { start: idleSelected } };
export const Conflict: Story = { name: 'A4 · separation lost', args: { start: { sim: () => conflict() } } };
export const Busy: Story = { name: 'A5 · busy (13 planes)', args: { start: { sim: () => busy() } } };
export const Paused: Story = { name: 'S5 · pause menu', args: { start: { sim: () => idle(), paused: true } } };
export const LastMinute: Story = { name: 'Last minute, none to come', args: { start: { sim: () => lastMinute() } } };
export const Endless: Story = { name: 'Endless session', args: { session: { icao: 'LHBP', traffic: 'steady', length: 'endless' }, start: { sim: () => idle() } } };
export const SelectedPaper: Story = { name: 'A2 · selected, Paper', args: { start: idleSelected }, parameters: { app: { theme: 'paper' } } };
export const ConflictPaper: Story = { name: 'A4 · separation lost, Paper', args: { start: { sim: () => conflict() } }, parameters: { app: { theme: 'paper' } } };
export const SelectedMetricLeft: Story = { name: 'A2 · metric, left-handed', args: { start: idleSelected }, parameters: { app: { settings: { altUnit: 'm', distUnit: 'km', handedness: 'left' } } } };
