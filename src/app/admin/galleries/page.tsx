"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type GalleryData = {
  [galleryName: string]: string[];
};

type GalleryMeta = {
  galleryName: string;
  category: string | string[];
  displayName?: string;
  description?: string;
  date?: string;
  accessType?: 'public' | 'password' | 'internal' | 'locked';
  password?: string;
};

export default function AdminGalleriesPage() {
  const [galleries, setGalleries] = useState<GalleryData>({});
  const [galleryNames, setGalleryNames] = useState<string[]>([]);
  const [galleryMetas, setGalleryMetas] = useState<GalleryMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Für Bearbeitung
  const [editData, setEditData] = useState({
    displayName: "",
    category: "",
    description: "",
    date: "",
    accessType: "public",
    password: ""
  });
  
  const router = useRouter();

  // Lade Kategorien
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Fehler beim Laden der Kategorien');
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error);
      }
    }
    fetchCategories();
  }, []);

  // Lade Galerien und prüfe Auth-Status
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
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
        
        // Lade Galerien
        const timestamp = new Date().getTime();
        const galleriesRes = await fetch(`/api/galleries?t=${timestamp}`);
        
        if (!galleriesRes.ok) {
          throw new Error(`Fehler beim Laden der Galerien: ${galleriesRes.status}`);
        }
        
        const data = await galleriesRes.json();
        
        if (data.galleries && typeof data.galleries === 'object') {
          setGalleries(data.galleries);
          
          // Sortiere Galerienamen nach Jahr (neueste zuerst) und dann alphabetisch
          const galleryEntries = Object.entries(data.galleries);
          
          // Debug: Zeige die ersten 5 Galerienamen
          console.log('Erste 5 Galerien vor der Sortierung:', galleryEntries.slice(0, 5).map(([name]) => name));
          
          const sortedEntries = [...galleryEntries].sort(([nameA], [nameB]) => {
            // Extrahiere das Jahr und den Rest des Pfades für die Sortierung
            const getSortData = (name: string) => {
              const parts = name.split('/');
              let year = 0;
              let restOfPath = '';
              let yearFound = false;
              
              // Durchsuche alle Teile nach einer gültigen Jahreszahl
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const match = part.match(/^(19|20)\d{2}$/);
                
                if (match && !yearFound) {
                  year = parseInt(match[0], 10);
                  yearFound = true;
                } else {
                  // Füge den Rest des Pfades für die alphabetische Sortierung hinzu
                  if (restOfPath) restOfPath += '/';
                  restOfPath += part.toLowerCase();
                }
              }
              
              return {
                year,
                sortKey: yearFound 
                  ? `${(9999 - year).toString().padStart(4, '0')}_${restOfPath}` // Für absteigende Jahresreihenfolge
                  : `9999_${restOfPath}` // Galerien ohne Jahr ans Ende
              };
            };
            
            const a = getSortData(nameA);
            const b = getSortData(nameB);
            
            // Sortiere nach dem zusammengesetzten Schlüssel
            return a.sortKey.localeCompare(b.sortKey);
          });
          
          // Debug: Zeige die ersten 5 sortierten Galerien
          console.log('Erste 5 Galerien nach der Sortierung:', sortedEntries.slice(0, 5).map(([name]) => name));
          
          const sortedNames = sortedEntries.map(([name]) => name);
          
          setGalleryNames(sortedNames);
          
          // Lade Metadaten für alle Galerien
          const metas = await Promise.all(
            sortedNames.map(async (galleryName) => {
              const images = data.galleries[galleryName] || [];
              if (!images.length) return { galleryName, category: "Sonstiges" };
              
              try {
                const firstImg = images[0];
                const metaUrl = firstImg.replace(/[^/]+$/, 'meta.json');
                const metaRes = await fetch(`/api/proxy-meta?url=${encodeURIComponent(metaUrl)}`);
                
                if (metaRes.ok) {
                  const meta = await metaRes.json();
                  return { 
                    galleryName, 
                    category: meta.category || meta.kategorie || "Sonstiges",
                    displayName: meta.displayName || meta.title || null,
                    description: meta.description || null,
                    date: meta.date || null,
                    accessType: meta.accessType || null,
                    password: meta.password || null
                  };
                }
              } catch (error) {
                console.error(`Fehler beim Laden der Metadaten für ${galleryName}:`, error);
              }
              
              return { galleryName, category: "Sonstiges" };
            })
          );
          
          setGalleryMetas(metas);
        } else {
          throw new Error('Keine Galerien gefunden');
        }
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        setError(error instanceof Error ? error.message : "Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [router]);

  // Filtere Galerien basierend auf dem Suchbegriff
  const filteredGalleries = galleryNames.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    galleryMetas.find(meta => meta.galleryName === name)?.category?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Galerie löschen
  const deleteGallery = async (galleryName: string) => {
    if (!confirm(`Möchtest du die Galerie "${galleryName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!`)) {
      return;
    }
    
    try {
      setProcessing(true);
      
      const response = await fetch('/api/file-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'deleteGallery',
          galleryName
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Galerie "${galleryName}" erfolgreich gelöscht.`);
        // Aktualisiere die Galerie-Liste
        window.location.reload();
      } else if (data.simulated) {
        alert(`Simulation: Galerie "${galleryName}" würde gelöscht werden.`);
      } else {
        alert(`Fehler beim Löschen der Galerie: ${data.error}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Galerie:', error);
      alert('Fehler beim Löschen der Galerie. Siehe Konsole für Details.');
    } finally {
      setProcessing(false);
    }
  };

  // Galerie bearbeiten
  const editGallery = (galleryName: string) => {
    const meta = galleryMetas.find(m => m.galleryName === galleryName);
    setSelectedGallery(galleryName);
    setEditMode(true);
    console.log('[DEBUG] editGallery aufgerufen. editMode ist jetzt:', true, 'selectedGallery:', galleryName);
    setEditData({
      displayName: meta?.displayName || "",
      category: Array.isArray(meta?.category) ? meta?.category[0] || "" : meta?.category || "",
      description: meta?.description || "",
      date: meta?.date || "",
      accessType: meta?.accessType || "public",
      password: meta?.password || ""
    });
  };


  // Hilfsfunktion zum Ordner-Umbenennen (über interne API, die extern weiterleitet)
  async function renameGalleryFolder(oldName: string, newName: string): Promise<boolean> {
    try {
      const res = await fetch('/api/file-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'renameGallery', galleryName: oldName, newName })
      });
      const data = await res.json();
      console.log('[DEBUG] Antwort von /api/file-operations renameGallery:', data);
      return !!data.success;
    } catch (err) {
      console.error('Fehler beim Ordner-Umbenennen:', err);
      return false;
    }
  }

  // Änderungen speichern
  const saveChanges = async () => {
    if (!selectedGallery) {
      console.log("[DEBUG] Kein selectedGallery gesetzt!");
      return;
    }

    try {
      setProcessing(true);

      // Debug: Zeige aktuelle Namen
      const oldName = selectedGallery;
      const newName = editData.displayName?.trim();
      console.log("[DEBUG] saveChanges: oldName =", oldName, "newName =", newName);

      let ordnerUmbenannt = true;

      if (oldName !== newName && newName) {
        console.log("[DEBUG] Starte Ordner-Umbenennung:", oldName, "→", newName);
        ordnerUmbenannt = await renameGalleryFolder(oldName, newName);
        console.log("[DEBUG] Ergebnis Ordner-Umbenennung:", ordnerUmbenannt);
        if (!ordnerUmbenannt) {
          alert("Der Ordner konnte nicht umbenannt werden!");
          setProcessing(false);
          return;
        }
      }

      // Jetzt Metadaten speichern (ggf. mit neuem Namen)
      const response = await fetch('/api/file-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'updateMetadata',
          galleryName: newName || oldName, // Metadaten auf neuen Namen speichern!
          metadata: {
            displayName: editData.displayName,
            category: editData.category,
            description: editData.description,
            date: editData.date,
            accessType: editData.accessType,
            password: editData.password
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Metadaten für "${newName || oldName}" erfolgreich aktualisiert.`);
        window.location.reload();
      } else if (data.simulated) {
        alert(`Simulation: Metadaten für "${newName || oldName}" würden aktualisiert werden.`);
        setEditMode(false);
        setSelectedGallery(null);
      } else {
        alert(`Fehler beim Aktualisieren der Metadaten: ${data.error}`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Metadaten:', error);
      alert('Fehler beim Aktualisieren der Metadaten. Siehe Konsole für Details.');
    } finally {
      setProcessing(false);
    }
  };

  // Galerie umbenennen
  const renameGallery = async () => {
    if (!selectedGallery || !editData.displayName) return;
    
    try {
      setProcessing(true);
      
      const response = await fetch('/api/file-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'renameGallery',
          galleryName: selectedGallery,
          newName: editData.displayName
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Galerie "${selectedGallery}" erfolgreich umbenannt in "${editData.displayName}".`);
        // Aktualisiere die Galerie-Liste
        window.location.reload();
      } else if (data.simulated) {
        alert(`Simulation: Galerie "${selectedGallery}" würde umbenannt werden in "${editData.displayName}".`);
        setEditMode(false);
        setSelectedGallery(null);
      } else {
        alert(`Fehler beim Umbenennen der Galerie: ${data.error}`);
      }
    } catch (error) {
      console.error('Fehler beim Umbenennen der Galerie:', error);
      alert('Fehler beim Umbenennen der Galerie. Siehe Konsole für Details.');
    } finally {
      setProcessing(false);
    }
  };

  // Neue Galerie erstellen
  const createNewGallery = () => {
    router.push('/admin/galleries/new');
  };

  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-200">
          Galerie-Verwaltung
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={createNewGallery}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
            disabled={processing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Neue Galerie
          </button>
          <Link href="/gallery" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Zur Galerie
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      {/* Suchleiste */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Suche nach Galerien oder Kategorien..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {editMode && selectedGallery ? (
        // Bearbeitungsmodus
        <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6 mb-6 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Galerie bearbeiten: {selectedGallery}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Anzeigename
              </label>
              <input
                type="text"
                id="displayName"
                value={editData.displayName}
                onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategorie
              </label>
              <select
                id="category"
                value={editData.category}
                onChange={(e) => setEditData({...editData, category: e.target.value})}
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
                value={editData.description}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={3}
              />
            </div>
            
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum
              </label>
              <input
                type="date"
                id="date"
                value={editData.date}
                onChange={(e) => setEditData({...editData, date: e.target.value})}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="accessType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Passwort (für passwortgeschützte Galerien)
              </label>
              <input
                type="text"
                id="password"
                value={editData.password}
                onChange={(e) => setEditData({...editData, password: e.target.value})}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Passwort für passwortgeschützte Galerien"
              />
            </div>
            
            {/* DEBUG-PANEL im Modal */}
            <div style={{background:'#222',color:'#0ff',padding:'8px',marginBottom:'12px',borderRadius:'6px'}}>
              <strong>[DEBUG]</strong> editMode: {String(editMode)} | selectedGallery: {selectedGallery || '-'} | displayName: {editData.displayName || '-'}
            </div>
            {/* DEBUG-BUTTON im Modal */}
            <button
              onClick={() => {console.log('[DEBUG] Speichern (DEBUG) Button geklickt'); saveChanges();}}
              disabled={processing}
              style={{marginBottom:'12px'}}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
              Speichern (DEBUG)
            </button>
            <div className="flex space-x-4 pt-4">
              <button
                onClick={saveChanges}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {processing ? "Wird gespeichert..." : "Änderungen speichern"}
              </button>
              
              <button
                onClick={renameGallery}
                disabled={processing || !editData.displayName}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {processing ? "Wird umbenannt..." : "Galerie umbenennen"}
              </button>
              
              <button
                onClick={() => {
                  setEditMode(false);
                  setSelectedGallery(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Galerie-Liste
        loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredGalleries.length > 0 ? (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">
                    Galerie
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Kategorie
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Bilder
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Zugriffstyp
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Passwort
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {filteredGalleries.map((galleryName) => {
                  const meta = galleryMetas.find(m => m.galleryName === galleryName);
                  const images = galleries[galleryName] || [];
                  
                  return (
                    <tr key={galleryName} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                        {meta?.displayName || galleryName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {Array.isArray(meta?.category) 
                          ? meta?.category.join(', ') 
                          : meta?.category || "Sonstiges"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {images.length}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {meta?.accessType === 'public' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                            Öffentlich
                          </span>
                        )}
                        {meta?.accessType === 'password' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                            Passwortgeschützt
                          </span>
                        )}
                        {meta?.accessType === 'internal' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                            Intern
                          </span>
                        )}
                        {!meta?.accessType && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {meta?.password ? meta.password : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => editGallery(galleryName)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Bearbeiten"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <Link
                            href={`/gallery?gallery=${encodeURIComponent(galleryName)}`}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Ansehen"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => deleteGallery(galleryName)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Löschen"
                            disabled={processing}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-medium mb-2">Keine Galerien gefunden</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm 
                ? `Keine Galerien gefunden, die "${searchTerm}" enthalten.` 
                : "Es wurden keine Galerien gefunden."}
            </p>
          </div>
        )
      )}
      {editMode && (
        <div className="flex justify-center mt-8">
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={saveChanges}
            disabled={processing}
          >
            Speichern (DEBUG)
          </button>
        </div>
      )}
      {/* Sichtbares Debug-Panel */}
      <div style={{position:'sticky',top:0,zIndex:1000,background:'#fff',border:'1px solid #eee',padding:'8px',marginBottom:'8px'}}>
        <strong>[DEBUG]</strong> editMode: {String(editMode)} | selectedGallery: {selectedGallery || '-'}
      </div>
    </main>
  );
}
