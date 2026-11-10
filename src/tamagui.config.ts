import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

// Cấu hình TamaGUI chuẩn (hỗ trợ cả Theme Light / Dark, Tokens, Media Queries & React Native props)
export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    allowedStyleValues: false,
    styleCompat: 'react-native',
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
