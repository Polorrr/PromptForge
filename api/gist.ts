import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { githubToken, filename, content, description, public: isPublic } =
    req.body;
  if (!githubToken)
    return res.status(400).json({ error: 'GitHub token required' });

  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${githubToken}`,
      },
      body: JSON.stringify({
        description,
        public: isPublic,
        files: { [filename]: { content } },
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
