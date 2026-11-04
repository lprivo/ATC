import type { Meta, StoryObj } from '@storybook/react-native';
import type { Sim } from '../engine/sim';
import { TUTORIAL, tutorialSim } from '../game/tutorial';
import { TutorialScreen } from './TutorialScreen';

/**
 * How to play (design T1–T4) on the tutorial's mini-session. Each story opens
 * at a step with the game in the state that step expects; the cards then wait
 * for the real gesture, as in the app.
 */
const meta = { title: 'Screens/How to play', component: TutorialScreen } satisfies Meta<typeof TutorialScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

const step = (g: (typeof TUTORIAL.steps)[number]['gesture']) => TUTORIAL.steps.findIndex((s) => s.gesture === g);
const plane = (sim: Sim) => sim.planes.find((p) => p.callsign === TUTORIAL.callsign)!;
/** The clear step and later: the plane already told to descend. */
const descending = () => {
  const sim = tutorialSim();
  sim.setAltitude(plane(sim).id, TUTORIAL.altitudeFt);
  return sim;
};
/** The pinch step and later: the plane also cleared to land. */
const cleared = () => {
  const sim = descending();
  const end = sim.runwayEnd(TUTORIAL.runway)!;
  sim.setRoute(plane(sim).id, [end.threshold], end.id);
  sim.events = [];
  return sim;
};

const t2 = { initialStep: step('descend'), start: { sim: tutorialSim, selectedCallsign: TUTORIAL.callsign } };
const t3 = { initialStep: step('clear'), start: { sim: descending } };
const done = { initialStep: TUTORIAL.steps.length, start: { sim: cleared } };
const paper = { app: { theme: 'paper' } };

export const T1: Story = { name: 'T1 · tap to select' };
export const T2: Story = { name: 'T2 · the steppers', args: t2 };
/** T2 with the plane's controls closed (a tap on empty radar): the card asks for the plane again. */
export const T2Reselect: Story = { name: 'T2 · plane deselected', args: { ...t2, start: { sim: tutorialSim } } };
export const T3: Story = { name: 'T3 · draw a path to a runway', args: t3 };
export const T4: Story = { name: 'T4 · pinch to zoom', args: { initialStep: step('pinch'), start: { sim: cleared } } };
export const Done: Story = { name: 'Done · START PLAYING', args: done };
export const T2Metric: Story = { name: 'T2 · metric', args: t2, parameters: { app: { settings: { altUnit: 'm' } } } };
export const T1Paper: Story = { name: 'T1 · Paper', parameters: paper };
export const T2Paper: Story = { name: 'T2 · Paper', args: t2, parameters: paper };
export const T3Paper: Story = { name: 'T3 · Paper', args: t3, parameters: paper };
export const T4Paper: Story = { name: 'T4 · Paper', args: { initialStep: step('pinch'), start: { sim: cleared } }, parameters: paper };
export const DonePaper: Story = { name: 'Done · Paper', args: done, parameters: paper };
