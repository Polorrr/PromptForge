import type { CommunityPrompt } from '@/types/prompt';

const SEARCH_MARKER = 'PromptForge';
const GITHUB_API = 'https://api.github.com';

export interface CommunityGist {
  id: string;
  title: string;
  prompt: string;
  original: string;
  explanation: string;
  tags: string[];
  category: string;
  author: string;
  gistUrl: string;
  rawUrl: string;
  stars: number;
  createdAt: string;
}

interface GistContent {
  title?: string;
  prompt?: string;
  original?: string;
  explanation?: string;
  tags?: string[];
  category?: string;
}

async function fetchGistContent(rawUrl: string): Promise<GistContent | null> {
  try {
    const res = await fetch(rawUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const communityService = {
  async searchPrompts(query?: string): Promise<CommunityGist[]> {
    try {
      // Search public Gists containing PromptForge marker
      const searchUrl = `${GITHUB_API}/search/code?q=${SEARCH_MARKER}+in:file+extension:json+fork:false&per_page=30`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return [];

      const searchData = await searchRes.json();
      const items = searchData.items || [];

      // Deduplicate by gist URL (each file in a gist is a separate search result)
      const seenGists = new Set<string>();
      const uniqueItems = items.filter((item: { repository?: { full_name?: string }; html_url?: string }) => {
        if (!item.repository?.full_name?.startsWith('gist:') || !item.html_url) return false;
        const gistUrl: string = item.html_url!.split('#')[0]!;
        if (seenGists.has(gistUrl)) return false;
        seenGists.add(gistUrl);
        return true;
      });

      const results: CommunityGist[] = [];

      for (const item of uniqueItems.slice(0, 20)) {
        const gistId = (item.repository?.full_name ?? '').replace('gist:', '');
        if (!gistId) continue;

        try {
          const gistRes = await fetch(`${GITHUB_API}/gists/${gistId}`);
          if (!gistRes.ok) continue;
          const gist = await gistRes.json();

          const filename = Object.keys(gist.files || {})[0];
          if (!filename) continue;
          const file = gist.files[filename];

          const content = await fetchGistContent(file.raw_url);
          if (!content || !content.prompt) continue;

          // Filter by search query if provided
          if (query) {
            const q = query.toLowerCase();
            const matchTitle = (content.title || '').toLowerCase().includes(q);
            const matchPrompt = (content.prompt || '').toLowerCase().includes(q);
            const matchTags = (content.tags || []).some((t: string) => t.toLowerCase().includes(q));
            if (!matchTitle && !matchPrompt && !matchTags) continue;
          }

          results.push({
            id: gistId,
            title: content.title || filename.replace('.json', ''),
            prompt: content.prompt || '',
            original: content.original || '',
            explanation: content.explanation || '',
            tags: content.tags || [],
            category: content.category || 'imported',
            author: gist.owner?.login || 'anonymous',
            gistUrl: gist.html_url,
            rawUrl: file.raw_url,
            stars: gist.stargazers_count || 0,
            createdAt: gist.created_at || new Date().toISOString(),
          });
        } catch {
          // skip failed gist
        }
      }

      return results;
    } catch {
      return [];
    }
  },

  async getGistById(gistId: string): Promise<CommunityGist | null> {
    try {
      const gistRes = await fetch(`${GITHUB_API}/gists/${gistId}`);
      if (!gistRes.ok) return null;
      const gist = await gistRes.json();

      const filename = Object.keys(gist.files || {})[0];
      if (!filename) return null;
      const file = gist.files[filename];
      const content = await fetchGistContent(file.raw_url);
      if (!content || !content.prompt) return null;

      return {
        id: gistId,
        title: content.title || filename.replace('.json', ''),
        prompt: content.prompt || '',
        original: content.original || '',
        explanation: content.explanation || '',
        tags: content.tags || [],
        category: content.category || 'imported',
        author: gist.owner?.login || 'anonymous',
        gistUrl: gist.html_url,
        rawUrl: file.raw_url,
        stars: gist.stargazers_count || 0,
        createdAt: gist.created_at || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },
};
