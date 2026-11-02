import type { Meta, StoryObj } from '@storybook/react-native';
import { SplashScreen } from './SplashScreen';

/** Design S1. The real splash loads in 1.4 s; these hold the progress bar so every stage can be inspected. */
const meta = {
  title: 'Screens/Splash',
  component: SplashScreen,
  args: { onDone: () => {} },
} satisfies Meta<typeof SplashScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { progress: 0.1 } };
export const HalfWay: Story = { args: { progress: 0.6 } };
export const Loaded: Story = { args: { progress: 1 } };
/** The real thing: fills over 1.4 s (onDone is a no-op here). */
export const Animated: Story = {};
export const Paper: Story = { args: { progress: 0.6 }, parameters: { app: { theme: 'paper' } } };
