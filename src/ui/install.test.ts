import { describe, expect, it } from 'vitest';
import { detectPlatform } from './install';

describe('install helper', () => {
  it('tells iPhone, iPad, Android and computers apart', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5)).toBe('ios'); // iPad
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130', 0)).toBe('other');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile')).toBe('android');
  });
});
