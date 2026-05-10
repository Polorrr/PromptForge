import type { CommunityPrompt } from '@/types/prompt';

const COMMUNITY_REPO = 'promptforge-community/prompts';

export const communityService = {
  async fetchPrompts(): Promise<CommunityPrompt[]> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${COMMUNITY_REPO}/contents/prompts`
      );
      if (!response.ok) return [];
      const files = await response.json();

      const prompts = await Promise.all(
        (files as Array<{ name: string; download_url: string }>)
          .filter((f) => f.name.endsWith('.json'))
          .map(async (f) => {
            const res = await fetch(f.download_url);
            return res.json();
          })
      );

      return prompts as CommunityPrompt[];
    } catch {
      return [];
    }
  },
};
