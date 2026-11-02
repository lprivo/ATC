import { useRouter } from 'expo-router';
import { MainMenu } from '../screens/MainMenu';

export default function Menu() {
  const router = useRouter();
  return <MainMenu onPlay={() => router.push('/game')} onChooseAirport={() => router.push('/airports')} />;
}
