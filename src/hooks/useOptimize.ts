import { useOptimizeStore } from '@/stores/useOptimizeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function useOptimize() {
  const store = useOptimizeStore();
  const settings = useSettingsStore();

  return {
    ...store,
    hasApiKey: !!settings.apiKeys[store.selectedProvider],
  };
}
