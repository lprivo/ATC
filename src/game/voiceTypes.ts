// Types for the generated radio voice clips (src/game/voiceClips.ts, issue #49).

/** One take of a piece: `m` leads on (middle of a number), `f` falls (end of a call), `t` a phrase piece. */
export interface Take {
  take: string;
  ms: number;
  /** require()d asset. */
  file: number;
}

export interface CastVoice {
  role: 'controller' | 'pilot';
  /** Piece id → its takes. Ids: `d4` digits, `lH` letters, `w_feet` words, `a_WZZ` airlines, `s_descend` phrase stems. */
  clips: Record<string, Take[]>;
}

export type VoiceClips = Record<string, CastVoice>;
