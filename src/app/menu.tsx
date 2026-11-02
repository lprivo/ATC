import { useRouter } from 'expo-router';
import { bestLine } from '../game/bestScores';
import { useResults } from '../game/ResultsContext';
import { MainMenu } from '../screens/MainMenu';

export default function Menu() {
  const router = useRouter();
  const { bests } = useResults();
  return (
    <MainMenu
      best={bestLine(bests)}
      onPlay={() => router.push('/game')}
      onChooseAirport={() => router.push('/airports')}
      onBestScores={() => router.push('/scores')}
      onSettings={() => router.push('/settings')}
    />
  );
}
