import { useIsFocused, useRouter } from 'expo-router';
import { bestLine } from '../game/bestScores';
import { useResults } from '../game/ResultsContext';
import { MainMenu } from '../screens/MainMenu';

export default function Menu() {
  const router = useRouter();
  const { bests } = useResults();
  // The menu stays mounted under the screens it opens; its animations pause while it's hidden.
  const focused = useIsFocused();
  return (
    <MainMenu
      active={focused}
      best={bestLine(bests)}
      onPlay={() => router.push('/game')}
      onChooseAirport={() => router.push('/airports')}
      onHowToPlay={() => router.push('/tutorial')}
      onBestScores={() => router.push('/scores')}
      onSettings={() => router.push('/settings')}
    />
  );
}
