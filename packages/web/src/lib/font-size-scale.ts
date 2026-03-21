export const fontSizeScale = {
  small: { size: '16px', scale: '0.96' },
  medium: { size: '16.5px', scale: '1' },
  large: { size: '17.5px', scale: '1.08' },
} as const;

export const defaultFontSizeConfig = fontSizeScale.medium;
