import { useLocalSearchParams, useRouter } from 'expo-router';
import { GameScreen } from '../game/GameScreen';
import { useEntitlement } from '../game/EntitlementContext';
import { parseSession } from '../game/session';

/** A session: /game?icao=LHBP&traffic=steady&length=30 (missing or unknown values fall back to the free session). */
export default function Game() {
  const router = useRouter();
  const params = useLocalSearchParams<{ icao?: string; traffic?: string; length?: string }>();
  const { entitlement } = useEntitlement();
  const session = parseSession(params, entitlement);
  return <GameScreen session={session} onQuit={() => router.dismissTo('/menu')} />;
}
