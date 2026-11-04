import { useLocalSearchParams, useRouter } from 'expo-router';
import { SessionSetup } from '../screens/SessionSetup';

export default function SessionRoute() {
  const router = useRouter();
  const { icao } = useLocalSearchParams<{ icao?: string }>();
  return (
    <SessionSetup
      icao={icao ?? 'LHBP'}
      onBack={() => router.back()}
      onStart={(s) => router.push({ pathname: '/game', params: { icao: s.icao, traffic: s.traffic, length: String(s.length) } })}
    />
  );
}
