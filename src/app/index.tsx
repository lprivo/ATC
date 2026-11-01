import { useRouter } from 'expo-router';
import { SplashScreen } from '../screens/SplashScreen';

/** App start (S1): the radar splash, then the main menu. */
export default function Index() {
  const router = useRouter();
  return <SplashScreen onDone={() => router.replace('/menu')} />;
}
