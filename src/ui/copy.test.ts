import { describe, expect, it } from 'vitest';
import { copy } from './copy';

describe('copy', () => {
  it('calls a 2 a deuce', () => {
    expect(copy(true).double(2, false)).toBe('Double deuce!');
    expect(copy(true).double(4, true)).toBe('Double four! Move di block!');
    expect(copy(false).double(2, false)).toBe('You rolled a double 2');
  });
});
