import { useRouter } from 'expo-router';
import { TutorialScreen } from '../screens/TutorialScreen';

/** How to play: the tutorial; START PLAYING goes straight into a session. */
export default function Tutorial() {
  const router = useRouter();
  return <TutorialScreen onStart={() => router.replace('/game')} onQuit={() => router.dismissTo('/menu')} />;
}
