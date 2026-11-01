import { describe, expect, it } from 'vitest';
import { HAPTIC_FOR } from './hapticMap';

describe('haptics table (design)', () => {
  it('maps each moment to the designed feedback', () => {
    expect(HAPTIC_FOR).toEqual({
      select: 'impactLight',
      step: 'selection',
      limit: 'impactRigid',
      drawStart: 'impactMedium',
      snap: 'impactRigid',
      landingConfirmed: 'success',
      conflict: 'warning',
    });
  });
});
