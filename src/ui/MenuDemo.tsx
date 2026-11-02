import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg from 'react-native-svg';
import { AIRPORTS } from '../engine/airports';
import { createDemo, pickDemoAirport, stepDemo } from '../game/demo';
import { useTheme } from '../theme/ThemeContext';
import { DataBlock, PlaneGlyph, StaticMap } from './Radar';
import { useLabelLayout } from './useLabelLayout';
import { useReduceMotion } from './useReduceMotion';
import type { Viewport } from './viewport';

/** The demo runs this many times faster than real time, so something is always happening. */
const DEMO_SPEED = 4;
/** Redraw rate: a background doesn't need the game's 30 fps. */
const RENDER_MS = 1000 / 15;
/** How much of the demo shows through: dimmed, so it reads as a background, not the game. */
const DEMO_OPACITY = 0.4;

/**
 * The main menu's living background (#40): a random playable airport, its
 * arrivals flying themselves in and landing (src/game/demo.ts), drawn with the
 * game's own radar pieces: map, planes with their tails, and short labels; no
 * route lines, which would compete with the menu. Not interactive and dimmed. It only runs while the
 * menu is focused, and stands still (one frame) when Reduce Motion is on.
 */
export function MenuDemo({
  centreY,
  scale,
  active = true,
  seed,
}: {
  centreY: number;
  scale: number;
  /** Whether the menu is the screen showing (the route passes `useIsFocused()`); the demo pauses when not. */
  active?: boolean;
  /** Fixed seed for a repeatable demo (stories); random by default. */
  seed?: number;
}) {
  const { theme } = useTheme();
  const [demo] = useState(() => createDemo(pickDemoAirport(Object.values(AIRPORTS), Math.random), seed ?? Math.floor(Math.random() * 1e9)));
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setFrame] = useState(0);
  const reduceMotion = useReduceMotion();
  const running = active && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let lastRender = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // a background tab doesn't jump
      last = now;
      stepDemo(demo, dt * DEMO_SPEED);
      if (now - lastRender >= RENDER_MS) {
        lastRender = now;
        setFrame((f) => f + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, demo]);

  // Stable between frames, so the memoised map isn't redrawn 15 times a second.
  const vp: Viewport = useMemo(() => ({ w: size.w, h: size.h, ox: size.w / 2, oy: size.h * centreY, scale }), [size.w, size.h, centreY, scale]);
  const labels = useLabelLayout(demo.sim, vp, theme, { selectedId: null, mode: 'min', labelScale: 1, animate: running });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={[StyleSheet.absoluteFill, { opacity: DEMO_OPACITY }]} onLayout={onLayout} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID="menu-demo">
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          {/* Rings come from the sweep layer above (design: .7), not this dimmed layer. */}
          <StaticMap airport={demo.sim.airport} vp={vp} theme={theme} rings={false} />
          {demo.sim.planes.map((p) => (
            <PlaneGlyph key={p.id} plane={p} vp={vp} theme={theme} selected={false} />
          ))}
          {demo.sim.planes.map((p) => {
            const l = labels.get(p.id);
            return l ? <DataBlock key={`l-${p.id}`} label={l} conflict={false} selected={false} theme={theme} /> : null;
          })}
        </Svg>
      )}
    </View>
  );
}
