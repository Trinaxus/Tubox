"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AllImagesPage() {
  const [allImages, setAllImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Lade alle Bilder direkt aus der JSON-Datei
  const loadAllImages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cache-Busting durch zufälligen Query-Parameter
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/galleries?t=${timestamp}`);
      
      if (!res.ok) {
        throw new Error(`Fehler beim Laden der Galerien: ${res.status}`);
      }
      
      const data = await res.json();
      const galleries = data.galleries || {};
      
      // Sammle alle Bilder aus allen Galerien
      const images: string[] = [];
      Object.values(galleries).forEach((galleryImages: any) => {
        if (Array.isArray(galleryImages)) {
          images.push(...galleryImages);
        }
      });
      
      setAllImages(images);
      console.log(`Insgesamt ${images.length} Bilder geladen`);
    } catch (error) {
      console.error("Fehler beim Laden der Bilder:", error);
      setError(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };
  
  // Beim ersten Laden Daten laden
  useEffect(() => {
    loadAllImages();
  }, []);
  
  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-200">Alle Bilder</h1>
        <button 
          onClick={() => router.push("/gallery")}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
        >
          &larr; Zurück zur Übersicht
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-8 border border-gray-100 dark:border-gray-800">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : allImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allImages.map((imageUrl, index) => (
              <div key={index} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg">
                <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={imageUrl} 
                    alt={`Bild ${index + 1}`} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Fehler beim Laden des Bildes: ${imageUrl}`);
                      e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Bild+nicht+verfügbar';
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-lg mb-1">Bild {index + 1}</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <a 
                      href={imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800/30"
                    >
                      Original öffnen
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-medium mb-2">Keine Bilder gefunden</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Es wurden keine Bilder in den Galerien gefunden.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <h3 className="font-medium mb-2">Fehler beim Laden der Daten</h3>
            <p>{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
