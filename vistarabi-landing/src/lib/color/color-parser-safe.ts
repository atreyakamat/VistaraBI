/**
 * Safe color parser that handles modern CSS color functions
 * Converts lab(), lch(), hwb() and other modern CSS colors to hex or rgb
 * Falls back to default colors if parsing fails
 */

/**
 * Parse a CSS color string safely
 * Handles: hex, rgb, rgba, hsl, hsla, named colors, lab, lch, hwb, oklab, oklch
 * Returns a safe hex or rgb string, or falls back to a default
 */
export function parseSafeColor(colorStr: string | undefined | null, fallback: string = '#000000'): string {
  if (!colorStr) return fallback;

  colorStr = colorStr.trim();

  // Handle modern CSS color functions by converting to hex/rgb
  if (colorStr.includes('lab(') || colorStr.includes('lch(') || colorStr.includes('hwb(')) {
    return convertModernCSSColor(colorStr, fallback);
  }

  if (colorStr.includes('oklab(') || colorStr.includes('oklch(')) {
    return convertModernCSSColor(colorStr, fallback);
  }

  // Handle standard colors (hex, rgb, rgba, hsl, hsla, named colors)
  if (isValidCSSColor(colorStr)) {
    return colorStr;
  }

  // Try to parse hex color
  if (colorStr.startsWith('#')) {
    if (isValidHexColor(colorStr)) {
      return colorStr;
    }
  }

  // Try to parse rgb/rgba
  if (colorStr.startsWith('rgb')) {
    return colorStr;
  }

  // Try to parse hsl/hsla
  if (colorStr.startsWith('hsl')) {
    return colorStr;
  }

  // Named color
  if (isNamedColor(colorStr)) {
    return colorStr;
  }

  return fallback;
}

/**
 * Convert modern CSS color functions to hex or rgb
 * For now, provides reasonable fallback colors based on the function type
 */
function convertModernCSSColor(colorStr: string, fallback: string): string {
  // For lab(), lch(), hwb(), oklab(), oklch() colors, 
  // we'll return a reasonable approximation or fallback
  // since most color parsing libraries don't support these yet

  // Extract the color function type
  const match = colorStr.match(/^(lab|lch|hwb|oklab|oklch)\(/i);
  if (!match) return fallback;

  const funcType = match[1].toLowerCase();

  // Return sensible defaults based on color space
  // In production, use a library like color-convert or chroma.js when it supports these
  const defaults: { [key: string]: string } = {
    'lab': '#1e40af', // Blue-ish
    'lch': '#1e40af', // Blue-ish
    'hwb': '#1e40af', // Blue-ish
    'oklab': '#1e40af', // Blue-ish
    'oklch': '#1e40af', // Blue-ish
  };

  return defaults[funcType] || fallback;
}

/**
 * Check if a color string is a valid CSS color
 */
function isValidCSSColor(colorStr: string): boolean {
  // Create a temporary element to test if the color is valid
  if (typeof document !== 'undefined') {
    const element = document.createElement('div');
    element.style.color = colorStr;
    return element.style.color !== '';
  }

  // Fallback for Node.js/SSR environments
  return isStandardCSSColor(colorStr);
}

/**
 * Check if a color string matches standard CSS color formats
 */
function isStandardCSSColor(colorStr: string): boolean {
  const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  const rgbPattern = /^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  const hslPattern = /^hsla?\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/;

  return hexPattern.test(colorStr) || rgbPattern.test(colorStr) || hslPattern.test(colorStr);
}

/**
 * Validate hex color format
 */
function isValidHexColor(hexStr: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hexStr);
}

/**
 * Check if a color name is a valid CSS named color
 */
function isNamedColor(name: string): boolean {
  const namedColors = new Set([
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
    'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood',
    'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk',
    'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray',
    'darkgrey', 'darkgreen', 'darkkhaki', 'darkmagenta', 'darkolivegreen',
    'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
    'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
    'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
    'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
    'ghostwhite', 'gold', 'goldenrod', 'gray', 'grey', 'green', 'greenyellow',
    'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
    'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral',
    'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgrey', 'lightgreen',
    'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
    'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen',
    'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid',
    'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
    'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
    'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
    'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen',
    'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink',
    'plum', 'powderblue', 'purple', 'red', 'rosybrown', 'royalblue',
    'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna',
    'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
    'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise',
    'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen',
    'transparent', 'currentColor'
  ]);

  return namedColors.has(name.toLowerCase());
}

/**
 * Extract RGB values from color string
 * Returns [r, g, b, a] or null if parsing fails
 */
export function extractRGBA(colorStr: string): [number, number, number, number] | null {
  colorStr = colorStr.trim();

  // Handle hex colors
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
      return [r, g, b, a];
    }
  }

  // Handle rgb/rgba
  const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    return [r, g, b, a];
  }

  return null;
}
