import { useRouter } from 'expo-router';
import { GameScreen } from '../game/GameScreen';

export default function Game() {
  const router = useRouter();
  return <GameScreen onQuit={() => (router.canGoBack() ? router.back() : router.replace('/menu'))} />;
}
