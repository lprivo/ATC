import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { GameScreen, type CoachState } from '../game/GameScreen';
import { formatAltitude } from '../game/settings';
import { useSettings } from '../game/SettingsContext';
import { cardFor, fillCopy, isDone, startTutorial, stepLabel, tick, TUTORIAL, tutorialSim, type TutorialDefinition } from '../game/tutorial';
import type { Sim } from '../engine/sim';
import { CoachMarks } from '../ui/CoachMarks';
import { coachShape } from '../ui/coachGeometry';
import { ZOOM } from '../ui/viewport';

/**
 * How to play (design T1–T4): the real game screen on the tutorial's
 * mini-session, with a coach mark per step that waits for the gesture.
 * START PLAYING (after the last step) calls `onStart`; the pause menu's Quit
 * calls `onQuit`. `initialStep` and `start` are for stories.
 */
export function TutorialScreen({
  onStart,
  onQuit,
  initialStep = 0,
  start,
  def = TUTORIAL,
}: {
  onStart?: () => void;
  onQuit?: () => void;
  initialStep?: number;
  start?: { sim: () => Sim; selectedCallsign?: string };
  def?: TutorialDefinition;
}) {
  const begin = useMemo(() => ({ selectedCallsign: start?.selectedCallsign, sim: start?.sim ?? (() => tutorialSim(def)), restartFromStart: true }), [start, def]);
  return <GameScreen onQuit={onQuit} start={begin} coach={(s) => <Coach state={s} def={def} initialStep={initialStep} onStart={onStart ?? (() => {})} />} />;
}

function Coach({ state, def, initialStep, onStart }: { state: CoachState; def: TutorialDefinition; initialStep: number; onStart: () => void }) {
  const { sim, selectedId, vp, sheetHeight, paused, landingPending, restart, deselect } = state;
  const { settings } = useSettings();
  const [tut, setTut] = useState(() => startTutorial(def, initialStep));

  const plane = sim.planes.find((p) => p.callsign === def.callsign && p.status === 'active') ?? null;
  const selected = selectedId ? (sim.plane(selectedId)?.callsign ?? null) : null;
  // tutorialSim checks the runway exists; a story's own sim might not have it.
  const runway = useMemo(() => {
    const end = sim.runwayEnd(def.runway);
    if (!end) throw new Error(`tutorial: no runway end ${def.runway} in this scene`);
    return end.threshold;
  }, [sim, def]);

  // A restart (pause menu, or the plane lost) starts the tutorial over, from where it was opened.
  const [tutSim, setTutSim] = useState(sim);
  if (tutSim !== sim) {
    setTutSim(sim);
    setTut(startTutorial(def, initialStep));
  }

  // The step machine, once per frame. A restart is asked for once per sim.
  const restartedFor = useRef<object | null>(null);
  useEffect(() => {
    const r = tick(def, tut, {
      planeActive: !!plane,
      selected,
      targetAltitude: plane ? plane.target.altitude : null,
      cleared: !!plane?.clearedRunway,
      zoom: vp ? vp.scale : null,
      maxZoom: ZOOM.max,
    });
    if (r.deselect) deselect();
    if (r.restart && restartedFor.current !== sim) {
      restartedFor.current = sim;
      restart();
    }
    if (r.state !== tut) setTut(r.state);
  });

  const done = isDone(def, tut);
  const card = cardFor(def, tut, selected);
  const values = { callsign: def.callsign, runway: def.runway, altitude: formatAltitude(def.altitudeFt, settings.altUnit, true) };
  const copy = fillCopy(card?.copy ?? def.steps[def.steps.length - 1], values);

  // Screen readers hear each new card, title and body.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(done ? 'Tutorial complete. Start playing.' : `${copy.title}. ${copy.body}`);
  }, [done, copy.title, copy.body]);

  if (!vp || paused) return null;
  const shape = card ? coachShape(card.spotlight, vp, { plane: plane?.pos ?? null, runway, sheetHeight }) : null;
  return (
    <CoachMarks
      card={{ label: stepLabel(def, tut), copy, legend: card?.legend ?? false }}
      shape={shape}
      w={vp.w}
      h={vp.h}
      sheetHeight={sheetHeight}
      done={done}
      hidden={landingPending}
      onStart={onStart}
    />
  );
}
