import { useIsFocused, useRouter } from 'expo-router';
import { SplashScreen } from '../screens/SplashScreen';

/** App start (S1): the radar splash, then the main menu. */
export default function Index() {
  const router = useRouter();
  const focused = useIsFocused();
  return <SplashScreen onDone={() => router.replace('/menu')} active={focused} />;
}
