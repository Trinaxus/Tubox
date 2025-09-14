import type { NextApiRequest, NextApiResponse } from 'next';

// Feste Standard-Kategorien (Baserow entfernt)
const DEFAULT_CATEGORIES = [
  'Portrait',
  'Landschaft',
  'Architektur',
  'Event',
  'Kunst',
  'Reise',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ categories: DEFAULT_CATEGORIES });
  }
  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
