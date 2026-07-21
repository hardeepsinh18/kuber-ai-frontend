import { describe, it, expect } from 'vitest';
import {
    formatPrice,
    formatPriceCompact,
    formatVolume,
    formatCrosshairDate,
    formatTickMark,
} from './formatters';

describe('formatPrice', () => {
    it('renders rupees with two decimals', () => {
        expect(formatPrice(4491.5)).toBe('₹4,491.50');
    });

    it('uses Indian lakh grouping for large values', () => {
        expect(formatPrice(1234567)).toBe('₹12,34,567.00');
    });

    it('handles zero', () => {
        expect(formatPrice(0)).toBe('₹0.00');
    });

    it('returns an em dash for null', () => {
        expect(formatPrice(null)).toBe('—');
    });
});

describe('formatPriceCompact', () => {
    it('omits decimals for the axis', () => {
        expect(formatPriceCompact(4491.5)).toBe('₹4,492');
    });
});

describe('formatVolume', () => {
    it('formats lakhs', () => {
        expect(formatVolume(4230000)).toBe('42.3L');
    });

    it('formats crores', () => {
        expect(formatVolume(12000000)).toBe('1.2Cr');
    });

    it('formats thousands', () => {
        expect(formatVolume(4200)).toBe('4.2K');
    });

    it('returns null for zero or negative', () => {
        expect(formatVolume(0)).toBeNull();
        expect(formatVolume(-5)).toBeNull();
    });
});

describe('formatCrosshairDate', () => {
    it('renders a full unambiguous date with weekday and year', () => {
        expect(formatCrosshairDate('2026-07-22')).toBe("Wed 22 Jul '26");
    });

    it('disambiguates the same month in different years', () => {
        expect(formatCrosshairDate('2025-01-07')).toBe("Tue 7 Jan '25");
        expect(formatCrosshairDate('2026-01-07')).toBe("Wed 7 Jan '26");
    });
});

describe('formatTickMark', () => {
    it('shows the year at a year boundary', () => {
        expect(formatTickMark('2026-01-07', 0)).toBe('2026');
    });

    it('shows the month at a month boundary', () => {
        expect(formatTickMark('2026-07-01', 1)).toBe('Jul');
    });

    it('shows the day number when zoomed in', () => {
        expect(formatTickMark('2026-07-22', 2)).toBe('22');
    });
});
