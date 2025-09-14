import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBlogPosts } from '../../../lib/baserow';
import { migrateFromBaserow } from '../../../lib/blogData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Einfache Sicherheitsüberprüfung - nur lokale Anfragen erlauben
  const host = req.headers.host || '';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    return res.status(403).json({ error: 'Nur lokale Anfragen sind erlaubt' });
  }

  try {
    console.log('Starte Migration von Baserow zu JSON-Dateien...');
    
    const baserowData = await fetchBlogPosts();
    console.log(`${baserowData.results.length} Blogeinträge gefunden in Baserow.`);
    
    const result = await migrateFromBaserow(baserowData);
    
    return res.status(200).json({ 
      success: true, 
      message: `Migration erfolgreich: ${result.count} Artikel migriert nach public/uploads/blog/` 
    });
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
}
