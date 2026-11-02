import { describe, expect, it } from 'vitest';
import { splitAlpha } from './color';

describe('splitAlpha', () => {
  it('splits an rgba colour into an opaque colour and its alpha', () => {
    expect(splitAlpha('rgba(148, 188, 227, 0.30)')).toEqual({ rgb: 'rgb(148,188,227)', alpha: 0.3 });
  });
  it('splits an 8-digit hex colour', () => {
    expect(splitAlpha('#b5d9fd80')).toEqual({ rgb: '#b5d9fd', alpha: 128 / 255 });
    expect(splitAlpha(' #b5d9fd80 ')).toEqual({ rgb: '#b5d9fd', alpha: 128 / 255 });
  });
  it('treats an rgba without a usable alpha, and any other colour, as opaque', () => {
    expect(splitAlpha('rgba(1,2,3)')).toEqual({ rgb: 'rgb(1,2,3)', alpha: 1 });
    expect(splitAlpha('#b5d9fd')).toEqual({ rgb: '#b5d9fd', alpha: 1 });
  });
});
