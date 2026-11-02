import type { Meta, StoryObj } from '@storybook/react-native';
import { MainMenu } from './MainMenu';

const noop = () => {};

/** Design S2, with the live demo radar behind it (#40). A fixed demo seed makes it repeatable. */
const meta = {
  title: 'Screens/Main menu',
  component: MainMenu,
  args: { onPlay: noop, onChooseAirport: noop, onBestScores: noop, onSettings: noop, best: null, demoSeed: 7 },
} satisfies Meta<typeof MainMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstLaunch: Story = {};
export const WithBestScore: Story = { args: { best: { score: '1,240', where: ' at LHBP, Steady, 30 min' } } };
/** Hidden under another screen: the demo and sweep are paused (one still frame). */
export const Paused: Story = { args: { active: false } };
/** "How to play" isn't wired yet, so it shows dimmed and disabled. */
export const Paper: Story = { args: { best: { score: '1,240', where: ' at LHBP, Steady, 30 min' } }, parameters: { app: { theme: 'paper' } } };
