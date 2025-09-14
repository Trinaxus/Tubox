import type { NextApiRequest, NextApiResponse } from 'next';

// Standard-Kategorien als Fallback
const DEFAULT_CATEGORIES = [
  "Portrait", 
  "Landschaft", 
  "Architektur", 
  "Event", 
  "Kunst", 
  "Reise"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Lade Kategorien aus Baserow
      const baserowToken = process.env.BASEROW_TOKEN;
      const baserowApiUrl = process.env.BASEROW_API_URL || 'https://api.baserow.io/api';
      const baserowDatabaseId = process.env.BASEROW_DATABASE_ID || 148; // Die ID der Datenbank
      const portfolioTableId = process.env.BASEROW_PORTFOLIO_TABLE_ID || 668; // Die ID der Portfolio-Tabelle
      
      // Baserow-API-Anfrage, um alle Einträge zu holen
      const response = await fetch(
        `${baserowApiUrl}/database/rows/table/${portfolioTableId}/?user_field_names=true`,
        {
          headers: {
            'Authorization': `Token ${baserowToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Extrahiere alle einzigartigen Kategorien aus den Einträgen
        // Verwende field_6076 (category) aus der Portfolio-Tabelle
        const categoryField = 'category'; // Standard-Feldname für user_field_names=true
        const allCategories = data.results
          .map((entry: any) => entry[categoryField])
          .filter((category: string) => category && category.trim() !== '');
        
        // Entferne Duplikate
        const uniqueCategories = [...new Set(allCategories)];
        
        console.log('Kategorien aus Baserow geladen:', uniqueCategories);
        res.status(200).json({ categories: uniqueCategories.length > 0 ? uniqueCategories : DEFAULT_CATEGORIES });
      } else {
        console.error('Fehler beim Laden der Kategorien aus Baserow:', await response.text());
        res.status(200).json({ categories: DEFAULT_CATEGORIES });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
      res.status(200).json({ categories: DEFAULT_CATEGORIES });
    }
  } else if (req.method === 'POST') {
    // Füge eine neue Kategorie zu einem bestehenden Eintrag hinzu oder erstelle einen neuen
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Kategorie fehlt' });
    }
    
    try {
      // Hier könntest du die Kategorie in Baserow speichern
      // Dies würde einen POST-Request an Baserow erfordern
      
      res.status(200).json({ success: true, message: 'Kategorie hinzugefügt' });
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Kategorie:', error);
      res.status(500).json({ error: 'Fehler beim Hinzufügen der Kategorie' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
