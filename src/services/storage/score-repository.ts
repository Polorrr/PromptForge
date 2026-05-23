import { db } from './db';
import type { PromptScore } from '@/types/prompt';
import type { OptimizeStyle } from '@/types/llm';

export const scoreRepository = {
  async add(score: Omit<PromptScore, 'id'>): Promise<number> {
    return db.scores.add(score as PromptScore);
  },

  async getByPromptId(promptId: string): Promise<PromptScore[]> {
    return db.scores.where('promptId').equals(promptId).sortBy('scoredAt');
  },

  async getLatest(promptId: string): Promise<PromptScore | undefined> {
    return db.scores
      .where('promptId')
      .equals(promptId)
      .last();
  },

  async getStats(promptId: string) {
    const scores = await this.getByPromptId(promptId);
    if (scores.length === 0) return null;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      count: scores.length,
      avgClarity: avg(scores.map((s) => s.scores.clarity)),
      avgCompleteness: avg(scores.map((s) => s.scores.completeness)),
      avgEffectiveness: avg(scores.map((s) => s.scores.effectiveness)),
      avgOverall: avg(scores.map((s) => s.overall)),
      trend: scores.map((s) => ({
        overall: s.overall,
        scoredAt: s.scoredAt,
        source: s.source,
      })),
    };
  },

  async getStyleStats(): Promise<Record<OptimizeStyle, { count: number; avgOverall: number } | null>> {
    const all = await db.scores.toArray();
    const byStyle: Record<string, PromptScore[]> = {};
    for (const s of all) {
      const key = s.style || 'default';
      if (!byStyle[key]) byStyle[key] = [];
      byStyle[key].push(s);
    }

    const result = {} as Record<OptimizeStyle, { count: number; avgOverall: number } | null>;
    for (const style of ['default', 'concise', 'detailed', 'creative', 'professional'] as OptimizeStyle[]) {
      const group = byStyle[style];
      if (!group || group.length === 0) {
        result[style] = null;
      } else {
        result[style] = {
          count: group.length,
          avgOverall: group.reduce((sum, s) => sum + s.overall, 0) / group.length,
        };
      }
    }
    return result;
  },

  async getTopExamples(limit: number = 3): Promise<PromptScore[]> {
    const all = await db.scores.toArray();
    return all
      .sort((a, b) => b.overall - a.overall)
      .slice(0, limit);
  },

  async deleteByPromptId(promptId: string): Promise<void> {
    await db.scores.where('promptId').equals(promptId).delete();
  },
};
