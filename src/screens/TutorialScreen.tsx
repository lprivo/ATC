import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { tutorial } from '../game/fixtures';
import { GameScreen, type CoachState } from '../game/GameScreen';
import { advance, TUTORIAL_CALLSIGN, TUTORIAL_DONE, TUTORIAL_STEPS, type StepIndex } from '../game/tutorial';
import type { Sim } from '../engine/sim';
import { CoachMarks } from '../ui/CoachMarks';
import { coachShape } from '../ui/coachGeometry';

/** The runway end T3 asks for. */
const TUTORIAL_RUNWAY = '13L';

/**
 * How to play (design T1–T4): the real game screen on a scripted mini-session,
 * with a coach mark per step that waits for the gesture. START PLAYING (after
 * the last step) calls `onStart`; the pause menu's Quit calls `onQuit`.
 * `initialStep` and `start` are for stories.
 */
export function TutorialScreen({
  onStart,
  onQuit,
  initialStep = 0,
  start,
}: {
  onStart?: () => void;
  onQuit?: () => void;
  initialStep?: StepIndex;
  start?: { sim: () => Sim; selectedCallsign?: string };
}) {
  return (
    <GameScreen
      onQuit={onQuit}
      start={start ?? { sim: tutorial }}
      coach={(s) => <Coach state={s} initialStep={initialStep} onStart={onStart ?? (() => {})} />}
    />
  );
}

function Coach({ state, initialStep, onStart }: { state: CoachState; initialStep: StepIndex; onStart: () => void }) {
  const { sim, selectedId, vp, sheetHeight, restart, deselect } = state;
  const [step, setStep] = useState(initialStep);
  // Zoom when the current step began: T4 asks for a zoom in from there.
  const zoomAtStep = useRef<number | null>(null);
  if (zoomAtStep.current === null && vp) zoomAtStep.current = vp.scale;

  const plane = sim.planes.find((p) => p.callsign === TUTORIAL_CALLSIGN && p.status === 'active') ?? null;
  const selected = selectedId ? (sim.plane(selectedId)?.callsign ?? null) : null;

  // A restart (pause menu) starts the tutorial over.
  const simRef = useRef(sim);
  useEffect(() => {
    if (simRef.current === sim) return;
    simRef.current = sim;
    setStep(0);
    zoomAtStep.current = vp?.scale ?? null;
  }, [sim, vp]);

  // The plane is gone (left the sector, or landed) before the last step: play the scene again.
  const lost = !plane && step < TUTORIAL_STEPS.length - 1;
  useEffect(() => {
    if (lost) restart();
  }, [lost, restart]);

  useEffect(() => {
    if (!vp || zoomAtStep.current === null) return;
    const next = advance(step, {
      selected,
      targetAltitude: plane ? plane.target.altitude : null,
      cleared: !!plane?.clearedRunway,
      zoom: vp.scale,
      zoomAtStep: zoomAtStep.current,
    });
    if (next !== step) {
      zoomAtStep.current = vp.scale;
      setStep(next);
    }
  });

  // T3 draws on the radar: close the plane's controls so the card doesn't sit on them (design T3).
  const deselectRef = useRef(deselect);
  deselectRef.current = deselect;
  useEffect(() => {
    if (step === 2) deselectRef.current();
  }, [step]);

  // Screen readers hear each new card.
  useEffect(() => {
    if (step < TUTORIAL_DONE) AccessibilityInfo.announceForAccessibility(TUTORIAL_STEPS[step].title);
    else AccessibilityInfo.announceForAccessibility('Tutorial complete. Start playing.');
  }, [step]);

  if (!vp) return null;
  const done = step >= TUTORIAL_DONE;
  const copy = TUTORIAL_STEPS[Math.min(step, TUTORIAL_STEPS.length - 1)];
  const runway = sim.runwayEnd(TUTORIAL_RUNWAY)!.threshold;
  const shape = done ? null : coachShape(copy.spotlight, vp, { plane: plane?.pos ?? null, runway, sheetHeight });
  return <CoachMarks step={step} shape={shape} w={vp.w} h={vp.h} done={done} onStart={onStart} />;
}
