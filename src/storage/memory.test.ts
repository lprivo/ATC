import { describe, expect, it } from 'vitest';
import { memoryKv } from './memory';

describe('memoryKv', () => {
  it('reads back what was written, and null for anything else', () => {
    const kv = memoryKv({ a: '1' });
    expect(kv.get('a')).toBe('1');
    expect(kv.get('b')).toBeNull();
    kv.set('b', '2');
    expect(kv.get('b')).toBe('2');
  });

  it('keeps each store separate', () => {
    const one = memoryKv();
    const two = memoryKv();
    one.set('k', 'v');
    expect(two.get('k')).toBeNull();
  });
});
