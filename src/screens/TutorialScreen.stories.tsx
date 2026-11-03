import type { Meta, StoryObj } from '@storybook/react-native';
import { tutorial } from '../game/fixtures';
import { TUTORIAL_CALLSIGN } from '../game/tutorial';
import { TutorialScreen } from './TutorialScreen';

/**
 * How to play (design T1–T4) on the tutorial's mini-session. Each story opens
 * at a step with the game in the state that step expects; the cards then wait
 * for the real gesture, as in the app.
 */
const meta = { title: 'Screens/How to play', component: TutorialScreen } satisfies Meta<typeof TutorialScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

const plane = (sim: ReturnType<typeof tutorial>) => sim.planes.find((p) => p.callsign === TUTORIAL_CALLSIGN)!;
/** T3 and later: the plane already told to descend to 4,000 ft. */
const descending = () => {
  const sim = tutorial();
  sim.setAltitude(plane(sim).id, 4000);
  return sim;
};
/** T4 and later: the plane also cleared to 13L. */
const cleared = () => {
  const sim = descending();
  const end = sim.runwayEnd('13L')!;
  sim.setRoute(plane(sim).id, [end.threshold], end.id);
  sim.events = [];
  return sim;
};

export const T1: Story = { name: 'T1 · tap to select' };
export const T2: Story = { name: 'T2 · the steppers', args: { initialStep: 1, start: { sim: tutorial, selectedCallsign: TUTORIAL_CALLSIGN } } };
export const T3: Story = { name: 'T3 · draw a path to a runway', args: { initialStep: 2, start: { sim: descending } } };
export const T4: Story = { name: 'T4 · pinch to zoom', args: { initialStep: 3, start: { sim: cleared } } };
export const Done: Story = { name: 'Done · START PLAYING', args: { initialStep: 4, start: { sim: cleared } } };
export const T1Paper: Story = { name: 'T1 · Paper', parameters: { app: { theme: 'paper' } } };
export const T3Paper: Story = { name: 'T3 · Paper', args: { initialStep: 2, start: { sim: descending } }, parameters: { app: { theme: 'paper' } } };
