import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid url parameter' });
    return;
  }
  try {
    const decodedUrl = decodeURIComponent(url);
    const response = await fetch(decodedUrl);
    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch remote JSON' });
      return;
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch remote JSON' });
  }
}
