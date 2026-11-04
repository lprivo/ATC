import type { Meta, StoryObj } from '@storybook/react-native';
import { RESULTS, SOME_BESTS } from '../stories/data';
import { BestScoresScreen } from './BestScoresScreen';
import { ChooseAirport } from './ChooseAirport';
import { SessionSetup } from './SessionSetup';
import { SettingsScreen } from './SettingsScreen';
import { SummaryScreen } from './SummaryScreen';

const noop = () => {};

/** The screens around the game (design S3a–S6), in the free and full versions and both themes. */
const meta = { title: 'Screens/Around the game' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChooseAirportFree: Story = { name: 'Choose airport · free', render: () => <ChooseAirport onPick={noop} onBack={noop} /> };
export const ChooseAirportFull: Story = { name: 'Choose airport · full', render: () => <ChooseAirport onPick={noop} onBack={noop} />, parameters: { app: { entitlement: 'full' } } };
export const SessionFree: Story = { name: 'Session setup · free (locked)', render: () => <SessionSetup icao="LHBP" onStart={noop} onBack={noop} /> };
export const SessionFull: Story = { name: 'Session setup · full', render: () => <SessionSetup icao="LHBP" onStart={noop} onBack={noop} />, parameters: { app: { entitlement: 'full' } } };
export const BestScoresEmpty: Story = { name: 'Best scores · none yet', render: () => <BestScoresScreen onBack={noop} /> };
export const BestScoresSome: Story = { name: 'Best scores · some', render: () => <BestScoresScreen onBack={noop} />, parameters: { app: { bests: SOME_BESTS } } };
export const Settings: Story = { name: 'Settings · Radar', render: () => <SettingsScreen onBack={noop} /> };
export const SettingsQuiet: Story = { name: 'Settings · music off, sounds turned down', render: () => <SettingsScreen onBack={noop} />, parameters: { app: { settings: { music: false, soundVolume: 0.4, radioVolume: 0.7 } } } };
export const SettingsPaper: Story = { name: 'Settings · Paper, metric, left-handed', render: () => <SettingsScreen onBack={noop} />, parameters: { app: { theme: 'paper', settings: { altUnit: 'm', distUnit: 'km', handedness: 'left' } } } };
export const SummaryFirst: Story = { name: 'Summary · first session', render: () => <SummaryScreen result={RESULTS.firstEver} onMenu={noop} onPlayAgain={noop} /> };
export const SummaryNewBest: Story = { name: 'Summary · new best', render: () => <SummaryScreen result={RESULTS.newBest} onMenu={noop} onPlayAgain={noop} /> };
export const SummaryBelowBest: Story = { name: 'Summary · below best, losses', render: () => <SummaryScreen result={RESULTS.belowBest} onMenu={noop} onPlayAgain={noop} /> };
export const SummaryEndedEarly: Story = { name: 'Summary · ended early', render: () => <SummaryScreen result={RESULTS.endedEarly} onMenu={noop} onPlayAgain={noop} /> };
export const SummaryEndless: Story = { name: 'Summary · endless', render: () => <SummaryScreen result={RESULTS.endless} onMenu={noop} onPlayAgain={noop} /> };
export const SummaryPaper: Story = { name: 'Summary · new best, Paper', render: () => <SummaryScreen result={RESULTS.newBest} onMenu={noop} onPlayAgain={noop} />, parameters: { app: { theme: 'paper' } } };
