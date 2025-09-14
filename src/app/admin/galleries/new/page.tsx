"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGalleryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    galleryName: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  
  const router = useRouter();

  // Lade Kategorien und prüfe Auth-Status
  useEffect(() => {
    async function loadData() {
      try {
        // Prüfe Auth-Status
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const userData = await authRes.json();
          setIsLoggedIn(true);
          setUserRole(userData.role);
          
          // Wenn kein Admin, zur Login-Seite weiterleiten
          if (userData.role !== 'admin') {
            alert('Diese Seite ist nur für Administratoren zugänglich.');
            router.push('/login');
            return;
          }
        } else {
          setIsLoggedIn(false);
          alert('Bitte melde dich an, um auf diese Seite zuzugreifen.');
          router.push('/login');
          return;
        }
        
        // Lade Kategorien
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Fehler beim Laden der Kategorien');
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError(error instanceof Error ? error.message : "Fehler beim Laden der Daten");
      }
    }
    
    loadData();
  }, [router]);

  // Datei-Upload-Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles(fileArray);
      
      // Erstelle Vorschau-URLs
      const newPreviewUrls = fileArray.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  // Formular-Änderungen
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Galerie erstellen
  const createGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.galleryName) {
      setError("Bitte gib einen Galerienamen ein.");
      return;
    }
    
    if (files.length === 0) {
      setError("Bitte wähle mindestens ein Bild aus.");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Formatiere den Galerienamen für den Dateinamen
      const formattedDate = new Date(formData.date).toLocaleDateString('de-DE').replace(/\./g, '.');
      const galleryFolderName = `${formattedDate} - ${formData.galleryName}`;
      
      // Erstelle FormData für den Upload
      const uploadData = new FormData();
      uploadData.append('galleryName', galleryFolderName);
      uploadData.append('category', formData.category);
      uploadData.append('description', formData.description);
      uploadData.append('date', formData.date);
      
      // Füge Bilder hinzu
      files.forEach(file => {
        uploadData.append('images', file);
      });
      
      // Simuliere Upload mit Fortschrittsanzeige
      const uploadSimulation = async () => {
        for (let i = 0; i <= 100; i += 5) {
          setUploadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      };
      
      // Starte Upload-Simulation
      uploadSimulation();
      
      // Sende Anfrage an die API
      // In einer echten Implementierung würde hier der tatsächliche Upload stattfinden
      // Da wir keine direkte Upload-Möglichkeit haben, simulieren wir den Erfolg
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Simulation: Galerie "${galleryFolderName}" würde erstellt werden mit ${files.length} Bildern.`);
      
      // Zurück zur Galerie-Verwaltung
      router.push('/admin/galleries');
    } catch (error) {
      console.error('Fehler beim Erstellen der Galerie:', error);
      setError(error instanceof Error ? error.message : "Fehler beim Erstellen der Galerie");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-200">
          Neue Galerie erstellen
        </h1>
        <Link href="/admin/galleries" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Zurück zur Übersicht
        </Link>
      </div>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6 mb-6 border border-gray-100 dark:border-gray-800">
        <form onSubmit={createGallery}>
          <div className="space-y-4">
            <div>
              <label htmlFor="galleryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Galeriename*
              </label>
              <input
                type="text"
                id="galleryName"
                name="galleryName"
                value={formData.galleryName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Der Name wird zusammen mit dem Datum als Ordnername verwendet.
              </p>
            </div>
            
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum*
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategorie
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Bitte wählen</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beschreibung
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={3}
              />
            </div>
            
            <div>
              <label htmlFor="images" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bilder hochladen*
              </label>
              <input
                type="file"
                id="images"
                name="images"
                onChange={handleFileChange}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                accept="image/*"
                multiple
                required
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Wähle mehrere Bilder aus, die in die Galerie hochgeladen werden sollen.
              </p>
            </div>
            
            {/* Bildvorschau */}
            {previewUrls.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Bildvorschau ({previewUrls.length} Bilder)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <img 
                        src={url} 
                        alt={`Vorschau ${index + 1}`} 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fortschrittsanzeige */}
            {loading && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Upload-Fortschritt
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {uploadProgress}% abgeschlossen
                </p>
              </div>
            )}
            
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "Wird erstellt..." : "Galerie erstellen"}
              </button>
              
              <Link
                href="/admin/galleries"
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors"
              >
                Abbrechen
              </Link>
            </div>
          </div>
        </form>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">
          Hinweis zur Simulation
        </h3>
        <p className="text-blue-700 dark:text-blue-400">
          In dieser Demo-Version wird der Upload nur simuliert. In einer echten Implementierung würden die Bilder auf den Webspace hochgeladen werden.
          <br />
          Um eine echte Upload-Funktion zu implementieren, müsste eine entsprechende API auf dem Webserver eingerichtet werden.
        </p>
      </div>
    </main>
  );
}
