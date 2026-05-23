import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Columns2, ArrowLeft } from 'lucide-react';
import { diffWords } from 'diff';
import { promptRepository } from '@/services/storage/prompt-repository';
import { usePromptStore } from '@/stores/usePromptStore';
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { Prompt } from '@/types/prompt';

export default function Compare() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { prompts, loadPrompts } = usePromptStore();
  const [leftPrompt, setLeftPrompt] = useState<Prompt | null>(null);
  const [rightPrompt, setRightPrompt] = useState<Prompt | null>(null);
  const [leftId, setLeftId] = useState(searchParams.get('a') || '');
  const [rightId, setRightId] = useState(searchParams.get('b') || '');

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (leftId) promptRepository.getById(leftId).then((p) => setLeftPrompt(p || null));
    else setLeftPrompt(null);
  }, [leftId]);

  useEffect(() => {
    if (rightId) promptRepository.getById(rightId).then((p) => setRightPrompt(p || null));
    else setRightPrompt(null);
  }, [rightId]);

  const diffResult = leftPrompt && rightPrompt
    ? diffWords(leftPrompt.optimizedText, rightPrompt.optimizedText)
    : null;

  if (!leftId || !rightId) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={ROUTES.LIBRARY} className="p-2 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-heading">{t('compare.title')}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Prompt A</label>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('compare.selectPrompt')}</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Prompt B</label>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('compare.selectPrompt')}</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        {leftId && rightId && leftId === rightId && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">{t('compare.samePrompt')}</p>
        )}

        {!leftId || !rightId ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 dark:bg-dark-2 flex items-center justify-center mb-4">
              <Columns2 size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm max-w-md text-center">
              {t('compare.selectTwoPrompts')}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to={ROUTES.LIBRARY} className="p-2 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-heading">{t('compare.title')}</h1>
      </div>

      {/* Prompt selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <select
          value={leftId}
          onChange={(e) => setLeftId(e.target.value)}
          className="h-10 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {prompts.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <select
          value={rightId}
          onChange={(e) => setRightId(e.target.value)}
          className="h-10 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {prompts.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Diff view */}
      {diffResult && (
        <div className="rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('compare.diff')}</h3>
          <div className="rounded-lg bg-surface-1 dark:bg-dark-1 p-4 overflow-x-auto">
            <pre className="whitespace-pre-wrap text-base font-sans leading-relaxed">
              {diffResult.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.added
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : part.removed
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 line-through'
                        : 'text-gray-800 dark:text-gray-200'
                  }
                >
                  {part.value}
                </span>
              ))}
            </pre>
          </div>
        </div>
      )}

      {/* Side by side */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {leftPrompt && (
          <div className="rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {leftPrompt.title}
            </h3>
            <div className="rounded-lg bg-surface-1 dark:bg-dark-1 p-4 overflow-x-auto">
              <pre className="whitespace-pre-wrap text-base text-gray-600 dark:text-gray-400 font-sans leading-relaxed">
                {leftPrompt.optimizedText}
              </pre>
            </div>
          </div>
        )}
        {rightPrompt && (
          <div className="rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              {rightPrompt.title}
            </h3>
            <div className="rounded-lg bg-brand-50/50 dark:bg-brand-900/10 p-4 overflow-x-auto">
              <pre className="whitespace-pre-wrap text-base text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
                {rightPrompt.optimizedText}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
