import { Redirect, useRouter } from 'expo-router';
import { useResults } from '../game/ResultsContext';
import { SummaryScreen } from '../screens/SummaryScreen';

export default function Summary() {
  const router = useRouter();
  const { last } = useResults();
  // Opened without a finished session (e.g. a reload): back to the menu.
  if (!last) return <Redirect href="/menu" />;
  const { session } = last;
  return (
    <SummaryScreen
      result={last}
      onMenu={() => router.dismissTo('/menu')}
      onPlayAgain={() => router.replace({ pathname: '/game', params: { icao: session.icao, traffic: session.traffic, length: String(session.length) } })}
    />
  );
}
