import { useRouter } from 'expo-router';
import { ChooseAirport } from '../screens/ChooseAirport';

export default function Airports() {
  const router = useRouter();
  return <ChooseAirport onPick={(icao) => router.push({ pathname: '/session', params: { icao } })} onBack={() => router.back()} />;
}
