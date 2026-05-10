import { useState, useEffect, useCallback } from 'react';
import { fetchRelayModels, type RelayModel } from '@/services/llm/custom';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function useRelayModels() {
  const { apiKeys, customBaseUrl } = useSettingsStore();
  const [models, setModels] = useState<RelayModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const key = apiKeys.custom;
    if (!key) {
      setModels([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchRelayModels(key, customBaseUrl || 'https://api.xxdlzs.top');
      list.sort((a, b) => a.id.localeCompare(b.id));
      setModels(list);
    } catch {
      setError('Failed to fetch models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [apiKeys.custom, customBaseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return { models, loading, error, reload: load };
}
