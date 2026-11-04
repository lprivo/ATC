// Types for the generated radio voice clips (src/game/voiceClips.ts, issue #49).

/** One take of a clip: `m0` continues (more follows), `f0` ends a call; `h0`, `h1` for hesitations. */
export interface Take {
  take: string;
  ms: number;
  /** require()d asset. */
  file: number;
}

export interface CastVoice {
  role: 'controller' | 'pilot';
  /** Clip id → its takes. Ids: `x_descend_four_thousand_feet` phrase chunks, `h_uh` hesitations. */
  clips: Record<string, Take[]>;
}

export type VoiceClips = Record<string, CastVoice>;
