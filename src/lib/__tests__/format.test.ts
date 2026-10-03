import { describe, expect, it } from 'vitest';
import { formatNumber, plural } from '@/lib/format';

describe('numbers written as in Iceland', () => {
  it('puts a period between the thousands and a comma before the decimals', () => {
    expect(formatNumber(900)).toBe('900');
    expect(formatNumber(5000)).toBe('5.000');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(12.5)).toBe('12,5');
    expect(formatNumber(1234.567)).toBe('1.234,567');
  });
  it('keeps as many decimals as asked, and always as many as required', () => {
    expect(formatNumber(1234.5678)).toBe('1.234,568');
    expect(formatNumber(3, { max: 1, min: 1 })).toBe('3,0');
    expect(formatNumber(2.26, { max: 1, min: 1 })).toBe('2,3');
    expect(formatNumber(0.04, { max: 1 })).toBe('0');
    expect(formatNumber(1.5, { max: 0 })).toBe('2');
  });
  it('handles the odd ones', () => {
    expect(formatNumber(-1234.5)).toBe('-1.234,5');
    expect(formatNumber(-0.0001, { max: 1 })).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('Icelandic number agreement', () => {
  it('takes the singular for a count ending in one, except the teens', () => {
    expect(plural(1, 'mynd', 'myndir')).toBe('mynd');
    expect(plural(21, 'mynd', 'myndir')).toBe('mynd');
    expect(plural(11, 'mynd', 'myndir')).toBe('myndir');
    expect(plural(111, 'mynd', 'myndir')).toBe('myndir');
    expect(plural(0, 'mynd', 'myndir')).toBe('myndir');
  });
});
