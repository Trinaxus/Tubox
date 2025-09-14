/**
 * Standardisiert URLs auf das WebDisk-Format
 * @param url Die zu standardisierende URL
 * @returns Die standardisierte URL
 */
export function ensureWebDiskUrl(url: string): string {
  // Standardisiere alle URLs auf WebDisk
  const WebDiskBaseUrl = "https://tubox.de/WebDisk/uploads/";
  
  // Extrahiere den Pfad nach /uploads/ aus der URL, falls vorhanden
  if (url && url.includes("/uploads/")) {
    const pathAfterUploads = url.split("/uploads/")[1];
    if (pathAfterUploads) {
      return `${WebDiskBaseUrl}${pathAfterUploads}`;
    }
  }
  
  // Wenn keine Anpassung nötig ist, gib die Original-URL zurück
  return url;
}
