import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Check,
  X,
  Download,
  Upload,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePromptStore } from '@/stores/usePromptStore';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { exportAllJSON, downloadJSON, importJSON } from '@/services/export/json-export';
import { db } from '@/services/storage/db';
import { cn } from '@/utils/cn';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const settings = useSettingsStore();
  const app = useAppStore();
  const { prompts, loadPrompts, createPrompt } = usePromptStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean>>({});

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const testConnection = async (provider: 'openai' | 'claude' | 'custom') => {
    setTesting(provider);
    setTestResult((prev) => ({ ...prev, [provider]: false }));

    try {
      const key = settings.apiKeys[provider];
      if (!key) throw new Error('No API key');

      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        setTestResult((prev) => ({ ...prev, [provider]: res.ok }));
      } else if (provider === 'custom') {
        let baseUrl = (settings.customBaseUrl || 'https://api.xxdlzs.top').trim().replace(/\/+$/, '');
        if (!baseUrl.endsWith('/v1')) baseUrl += '/v1';
        let res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          const base2 = baseUrl.replace(/\/v1$/, '');
          res = await fetch(`${base2}/v1/models`, {
            headers: { Authorization: `Bearer ${key}` },
          });
        }
        setTestResult((prev) => ({ ...prev, [provider]: res.ok }));
      } else {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: key,
            model: 'claude-haiku-4-20250414',
            prompt: 'Say "ok"',
            maxTokens: 10,
          }),
        });
        setTestResult((prev) => ({ ...prev, [provider]: res.ok }));
      }
    } catch {
      setTestResult((prev) => ({ ...prev, [provider]: false }));
    } finally {
      setTesting(null);
    }
  };

  const handleExportAll = () => {
    const json = exportAllJSON(prompts);
    downloadJSON(json, `promptforge-export-${Date.now()}.json`);
    toast('success', t('settings.exportAll') + ' ✓');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const items = await importJSON(file);
        for (const item of items) {
          if (item.originalText && item.optimizedText) {
            await createPrompt({
              title: item.title || 'Imported',
              originalText: item.originalText,
              optimizedText: item.optimizedText,
              explanation: item.explanation || '',
              category: item.category || 'other',
              tags: item.tags || [],
              provider: (item.provider as 'openai' | 'claude' | 'custom') || 'openai',
              model: item.model || 'unknown',
              isFavorite: false,
            });
          }
        }
        await loadPrompts();
        toast('success', t('settings.importPrompts') + ' ✓');
      } catch {
        toast('error', t('common.error'));
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    if (!window.confirm(t('settings.clearAllConfirm'))) return;
    await db.prompts.clear();
    await loadPrompts();
    toast('success', t('settings.clearAll') + ' ✓');
  };

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    app.setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 space-y-8">
      <h1 className="text-heading">{t('settings.title')}</h1>

      {/* API Keys */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('settings.apiKeys')}</h2>
        <p className="text-xs text-gray-500 mb-4">{t('settings.securityNote')}</p>

        <div className="space-y-4">
          {/* OpenAI */}
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('settings.openaiKey')}</label>
              <div className="flex items-center gap-2">
                {testResult.openai !== undefined && (
                  <span
                    className={cn(
                      'text-xs',
                      testResult.openai ? 'text-success' : 'text-error'
                    )}
                  >
                    {testResult.openai
                      ? t('settings.connectionSuccess')
                      : t('settings.connectionFailed')}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => testConnection('openai')}
                  loading={testing === 'openai'}
                  disabled={!settings.apiKeys.openai}
                >
                  {t('settings.testConnection')}
                </Button>
              </div>
            </div>
            <div className="relative">
              <input
                type={showKeys.openai ? 'text' : 'password'}
                value={settings.apiKeys.openai || ''}
                onChange={(e) => settings.setApiKey('openai', e.target.value)}
                placeholder={t('settings.openaiPlaceholder')}
                className="w-full h-10 pr-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => toggleShowKey('openai')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys.openai ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Claude */}
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('settings.claudeKey')}</label>
              <div className="flex items-center gap-2">
                {testResult.claude !== undefined && (
                  <span
                    className={cn(
                      'text-xs',
                      testResult.claude ? 'text-success' : 'text-error'
                    )}
                  >
                    {testResult.claude
                      ? t('settings.connectionSuccess')
                      : t('settings.connectionFailed')}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => testConnection('claude')}
                  loading={testing === 'claude'}
                  disabled={!settings.apiKeys.claude}
                >
                  {t('settings.testConnection')}
                </Button>
              </div>
            </div>
            <div className="relative">
              <input
                type={showKeys.claude ? 'text' : 'password'}
                value={settings.apiKeys.claude || ''}
                onChange={(e) => settings.setApiKey('claude', e.target.value)}
                placeholder={t('settings.claudePlaceholder')}
                className="w-full h-10 pr-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => toggleShowKey('claude')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys.claude ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Custom API Relay */}
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('settings.customKey')}</label>
              <div className="flex items-center gap-2">
                {testResult.custom !== undefined && (
                  <span
                    className={cn(
                      'text-xs',
                      testResult.custom ? 'text-success' : 'text-error'
                    )}
                  >
                    {testResult.custom
                      ? t('settings.connectionSuccess')
                      : t('settings.connectionFailed')}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => testConnection('custom')}
                  loading={testing === 'custom'}
                  disabled={!settings.apiKeys.custom}
                >
                  {t('settings.testConnection')}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKeys.custom ? 'text' : 'password'}
                  value={settings.apiKeys.custom || ''}
                  onChange={(e) => settings.setApiKey('custom', e.target.value)}
                  placeholder={t('settings.customPlaceholder')}
                  className="w-full h-10 pr-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={() => toggleShowKey('custom')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.custom ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('settings.customBaseUrl')}</label>
                <input
                  type="text"
                  value={settings.customBaseUrl || 'https://api.xxdlzs.top'}
                  onChange={(e) => settings.setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.xxdlzs.top"
                  className="w-full h-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-400 mt-1">{t('settings.customBaseUrlHint')}</p>
              </div>
            </div>
          </div>

          {/* GitHub Token */}
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('settings.githubToken')}</label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-500 hover:underline flex items-center gap-1"
              >
                {t('settings.getToken')} <ExternalLink size={12} />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.github ? 'text' : 'password'}
                value={settings.apiKeys.github || ''}
                onChange={(e) => settings.setApiKey('github', e.target.value)}
                placeholder={t('settings.githubPlaceholder')}
                className="w-full h-10 pr-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => toggleShowKey('github')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys.github ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Display */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('settings.display')}</h2>
        <div className="space-y-4">
          {/* Language */}
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings.language')}</span>
            <select
              value={app.language ?? 'en'}
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'zh')}
              className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings.theme')}</span>
            <select
              value={app.theme ?? 'system'}
              onChange={(e) =>
                app.setTheme(e.target.value as 'light' | 'dark' | 'system')
              }
              className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="light">{t('settings.light')}</option>
              <option value="dark">{t('settings.dark')}</option>
              <option value="system">{t('settings.system')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('settings.dataManagement')}</h2>
        <div className="space-y-3">
          <Button variant="secondary" onClick={handleExportAll} className="w-full justify-start">
            <Download size={16} />
            {t('settings.exportAll')}
          </Button>
          <Button variant="secondary" onClick={handleImport} className="w-full justify-start">
            <Upload size={16} />
            {t('settings.importPrompts')}
          </Button>
          <Button
            variant="danger"
            onClick={handleClearAll}
            className="w-full justify-start"
          >
            <Trash2 size={16} />
            {t('settings.clearAll')}
          </Button>
        </div>
      </section>

      {/* About */}
      <section className="pt-4 border-t border-surface-2 dark:border-dark-3">
        <h2 className="text-lg font-semibold mb-4 text-center">{t('settings.about')}</h2>
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p className="font-medium">PromptForge v1.0.0</p>
          <p>AI Prompt Optimizer & Library</p>
          <a
            href="https://github.com/promptforge/promptforge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-500 hover:underline inline-flex items-center gap-1"
          >
            GitHub <ExternalLink size={12} />
          </a>
        </div>
      </section>
    </div>
  );
}
