import { router } from 'expo-router';

export function goBackSafely(fallbackHref: any = '/(tabs)') {
  if (typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
}
