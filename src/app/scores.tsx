import { useRouter } from 'expo-router';
import { BestScoresScreen } from '../screens/BestScoresScreen';

export default function Scores() {
  const router = useRouter();
  return <BestScoresScreen onBack={() => router.back()} />;
}
