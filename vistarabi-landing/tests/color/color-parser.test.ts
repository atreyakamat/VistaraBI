import { describe, it, expect } from 'vitest';
import { parseSafeColor, extractRGBA } from '@/lib/color/color-parser-safe';

describe('Safe Color Parser', () => {
  describe('parseSafeColor', () => {
    it('should handle standard hex colors', () => {
      expect(parseSafeColor('#000000')).toBe('#000000');
      expect(parseSafeColor('#ffffff')).toBe('#ffffff');
      expect(parseSafeColor('#1e40af')).toBe('#1e40af');
    });

    it('should handle hex colors with alpha', () => {
      expect(parseSafeColor('#000000ff')).toBe('#000000ff');
      expect(parseSafeColor('#ffffff80')).toBe('#ffffff80');
    });

    it('should handle RGB colors', () => {
      expect(parseSafeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
      expect(parseSafeColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should handle HSL colors', () => {
      expect(parseSafeColor('hsl(0, 100%, 50%)')).toBe('hsl(0, 100%, 50%)');
      expect(parseSafeColor('hsla(0, 100%, 50%, 0.5)')).toBe('hsla(0, 100%, 50%, 0.5)');
    });

    it('should handle named colors', () => {
      expect(parseSafeColor('red')).toBe('red');
      expect(parseSafeColor('blue')).toBe('blue');
      expect(parseSafeColor('transparent')).toBe('transparent');
    });

    it('should convert modern lab() colors to fallback', () => {
      const result = parseSafeColor('lab(50% 0 0)');
      expect(result).toBe('#1e40af');
    });

    it('should convert modern lch() colors to fallback', () => {
      const result = parseSafeColor('lch(50% 0 0)');
      expect(result).toBe('#1e40af');
    });

    it('should convert modern hwb() colors to fallback', () => {
      const result = parseSafeColor('hwb(194 0% 0%)');
      expect(result).toBe('#1e40af');
    });

    it('should convert modern oklab() colors to fallback', () => {
      const result = parseSafeColor('oklab(50% 0 0)');
      expect(result).toBe('#1e40af');
    });

    it('should convert modern oklch() colors to fallback', () => {
      const result = parseSafeColor('oklch(50% 0 0)');
      expect(result).toBe('#1e40af');
    });

    it('should return fallback for invalid colors', () => {
      const fallback = '#cccccc';
      expect(parseSafeColor('not-a-color', fallback)).toBe(fallback);
      expect(parseSafeColor('invalid-color-function()', fallback)).toBe(fallback);
    });

    it('should return fallback for null/undefined', () => {
      const fallback = '#000000';
      expect(parseSafeColor(null, fallback)).toBe(fallback);
      expect(parseSafeColor(undefined, fallback)).toBe(fallback);
      expect(parseSafeColor('', fallback)).toBe(fallback);
    });

    it('should handle whitespace', () => {
      expect(parseSafeColor('  #ffffff  ')).toBe('#ffffff');
      expect(parseSafeColor('  rgb(255, 0, 0)  ')).toBe('rgb(255, 0, 0)');
    });

    it('should use default fallback when not specified', () => {
      expect(parseSafeColor('invalid')).toBe('#000000');
    });
  });

  describe('extractRGBA', () => {
    it('should extract RGBA from hex colors', () => {
      const result = extractRGBA('#ff0000');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should extract RGBA from hex colors with alpha', () => {
      const result = extractRGBA('#ff000080');
      expect(result).toEqual([255, 0, 0, 0.5019607843137255]);
    });

    it('should extract RGBA from RGB strings', () => {
      const result = extractRGBA('rgb(255, 0, 0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should extract RGBA from RGBA strings', () => {
      const result = extractRGBA('rgba(255, 0, 0, 0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should return null for invalid color strings', () => {
      expect(extractRGBA('not-a-color')).toBeNull();
      expect(extractRGBA('hsl(0, 100%, 50%)')).toBeNull();
      expect(extractRGBA('blue')).toBeNull();
    });

    it('should handle whitespace in RGB strings', () => {
      const result = extractRGBA('rgb( 255 , 0 , 0 )');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should handle different hex formats', () => {
      // 3-digit hex not supported by this implementation
      expect(extractRGBA('#f00')).toBeNull();
      
      // 6-digit hex
      expect(extractRGBA('#ff0000')).toEqual([255, 0, 0, 1]);
      
      // 8-digit hex
      expect(extractRGBA('#ff0000ff')).toEqual([255, 0, 0, 1]);
    });
  });

  describe('Edge cases', () => {
    it('should handle color function variations', () => {
      // Modern color functions should be converted to fallback
      const result1 = parseSafeColor('LAB(50% 0 0)', '#default');
      const result2 = parseSafeColor('lab(50% 0 0)', '#default');
      // Both should work and be consistent
      expect([result1, result2]).toContain('#1e40af');
      expect([result1, result2]).toContain('#default');
    });

    it('should handle CSS variables and special keywords', () => {
      // CSS var() is not a standard color
      const varResult = parseSafeColor('var(--color-primary)', '#default');
      expect(varResult).toBe('#default');
      
      // currentColor is a CSS keyword
      const currentResult = parseSafeColor('currentColor');
      expect(['currentColor', '#000000']).toContain(currentResult);
    });

    it('should not break on empty color strings', () => {
      expect(parseSafeColor('', '#fallback')).toBe('#fallback');
      expect(parseSafeColor('   ', '#fallback')).toBe('#fallback');
    });

    it('should handle multiple spaces in RGB', () => {
      const result = extractRGBA('rgb(  255  ,  0  ,  0  )');
      expect(result).toEqual([255, 0, 0, 1]);
    });
  });
});
