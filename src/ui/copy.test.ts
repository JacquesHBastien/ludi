import { describe, expect, it } from 'vitest';
import { copy } from './copy';

describe('copy', () => {
  it('calls a 1 an ace and a 2 a deuce in Patois, plain numbers otherwise', () => {
    expect(copy(true).double(1, false)).toBe('Double ace!');
    expect(copy(true).double(2, false)).toBe('Double deuce!');
    expect(copy(true).double(4, true)).toBe('Double four! Move di block!');
    expect(copy(false).double(1, false)).toBe('Double one!');
    expect(copy(false).double(2, false)).toBe('Double two!');
    expect(copy(false).double(4, true)).toBe('Double four! Move your block!');
  });
});
