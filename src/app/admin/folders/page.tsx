"use client";

import React, { useState, useEffect, useRef } from "react";
import FolderActions from "./FolderActions";
import FolderTree from "./components/FolderTree";
import styles from "../admin.module.css";
import AdminNav from "../AdminNav";

// Interne API verwenden, damit lokal/extern funktioniert und keine CORS-Blockaden auftreten
const FILE_OPERATIONS_API = "/api/file-operations";
const FILE_OPERATIONS_TOKEN = ""; // Token wird serverseitig verwendet, Client sendet keins

// Hilfsfunktion für robuste JSON-Extraktion
async function safeJsonParse(response: Response, logPrefix: string = "API"): Promise<any> {
  // Zuerst die Rohtext-Antwort abrufen und loggen
  const responseText = await response.text();
  console.log(`[${logPrefix}] Raw Response:`, responseText);
  
  let data: any = { success: false };
  
  try {
    // Versuche, nur den JSON-Teil aus der Antwort zu extrahieren
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      // Extrahiere den Teil zwischen den Klammern (einschließlich der Klammern)
      const jsonPart = responseText.substring(firstBrace, lastBrace + 1);
      console.log(`[${logPrefix}] Extracted JSON part:`, jsonPart);
      data = JSON.parse(jsonPart);
      console.log(`[${logPrefix}] Parsed Response:`, data);
    } else {
      // Kein JSON gefunden
      console.error(`[${logPrefix}] No JSON found in response`);
      // Fallback: Erstelle ein Erfolgs-Objekt, wenn die Antwort HTTP 200 ist
      if (response.ok) {
        data = { success: true };
      } else {
        throw new Error(`Keine JSON-Daten in der Antwort gefunden: ${responseText}`);
      }
    }
  } catch (parseError) {
    console.error(`[${logPrefix}] JSON Parse Error:`, parseError);
    // Fallback: Erstelle ein Erfolgs-Objekt, wenn die Antwort leer ist oder HTTP 200
    if (!responseText || responseText.trim() === '') {
      data = { success: true };
    } else if (response.ok) {
      data = { success: true };
    } else {
      throw new Error(`Ungültige API-Antwort: ${responseText}`);
    }
  }
  
  return data;
}

// Typ für Datei/Ordner-Knoten
interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory" | "folder";
  children?: FileNode[];
  size?: number;
}

export default function FolderAdminPage() {
  // ... (States und Logik wie gehabt)

  // State-Variablen
  // Statt selectedNode speichern wir das ganze Node-Objekt (mit type, path etc.)
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [movingFolder, setMovingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Ordnerstruktur laden
  useEffect(() => {
    async function fetchTree() {
      setLoading(true);
      try {
        console.log("Interne API URL:", FILE_OPERATIONS_API);


        // API-Aufruf für die echte Implementierung
        // Fehler testen und auf GET-Methode zurückfallen
        let response;
        let data;
        
        try {
          // Mode 'cors' explizit angeben und ggf. weitere Header für CORS
          response = await fetch(`${FILE_OPERATIONS_API}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ operation: 'list', source: 'uploads' })
          });
          
          console.log("POST-Antwort erhalten:", response.status, response.statusText);
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
          }

          try {
            data = await response.json();
          } catch (jsonErr) {
            throw new Error(`Antwort ist kein valides JSON: ${jsonErr}`);
          }
          
          if (data && data.success) {
            console.log("Ordnerstruktur geladen:", data.folders);
            setDebugInfo(data);
            setTree(data.folders);
          } else {
            console.error("Fehler beim Laden der Ordnerstruktur:", data.error);
            setError(`API-Fehler: ${data.error || 'Unbekannter Fehler'}`);
            setTree([]);
          }
        } catch (err) {
          console.error("Interner API-Aufruf fehlgeschlagen:", err);
          setError(`API nicht erreichbar: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
          setTree([]);
        }
        
        setError(null);
      } catch (error) {
        console.error("Fehler beim Abrufen der Ordnerstruktur:", error);
        setError("Fehler beim Abrufen der Ordnerstruktur");
      } finally {
        setLoading(false);
      }
    }
    
    fetchTree();
  }, []);

  // Ordner ein-/ausklappen
  function toggleFolder(path: string) {
    setOpenFolders(prev => ({ ...prev, [path]: !prev[path] }));
  }

  // Ordnerstruktur neu laden
  async function reloadFolderStructure() {
    setLoading(true);
    try {
      const response = await fetch(`${FILE_OPERATIONS_API}?action=list`, {
        method: 'POST',
        headers: {
          'X-API-TOKEN': FILE_OPERATIONS_TOKEN
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Ordnerstruktur neu geladen:", data.folders);
        setDebugInfo(data);
        setTree(data.folders);
        setError(null);
      } else {
        console.error("Fehler beim Neuladen der Ordnerstruktur:", data.error);
        setError("Fehler beim Neuladen der Ordnerstruktur: " + data.error);
      }
    } catch (error) {
      console.error("Fehler beim Neuladen der Ordnerstruktur:", error);
      setError("Fehler beim Neuladen der Ordnerstruktur");
    } finally {
      setLoading(false);
    }
  }

  // Neuen Ordner erstellen
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    
    setCreatingFolder(true);
    
    try {
      // Bestimme den Pfad für den neuen Ordner
      const basePath = selectedNode?.path || "uploads";
      const newFolderPath = `${basePath}/${newFolderName}`;
      
      console.log("Erstelle neuen Ordner:", newFolderPath);
      
      const apiUrl = FILE_OPERATIONS_API;
      const apiToken = FILE_OPERATIONS_TOKEN;
      
      // API-Aufruf zum Erstellen des Ordners
      let data: any;
      
      try {
        // POST-Methode versuchen
        const response = await fetch(`${apiUrl}?action=create_folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-API-TOKEN': apiToken
          },
          body: `path=${encodeURIComponent(newFolderPath)}&name=${encodeURIComponent(newFolderName)}`
        });
        
        // Verwende die robuste JSON-Extraktion
        data = await safeJsonParse(response, "CreateFolder");
      } catch (postError) {
        console.error("POST-Anfrage fehlgeschlagen, versuche GET:", postError);
        
        // Fallback auf GET-Methode
        const fallbackResponse = await fetch(`${apiUrl}?action=create_folder&path=${encodeURIComponent(newFolderPath)}`, {
          method: 'GET',
          headers: {
            'X-API-TOKEN': apiToken
          }
        });
        
        // Auch für den GET-Fallback die robuste JSON-Extraktion verwenden
        data = await safeJsonParse(fallbackResponse, "CreateFolderFallback");
      }
      
      if (data.success) {
        console.log("Ordner erfolgreich erstellt:", data);
        setNewFolderName("");
        setShowNewFolderDialog(false);
        // Ordnerstruktur neu laden
        await reloadFolderStructure();
      } else {
        console.error("Fehler beim Erstellen des Ordners:", data.error);
        setError(`Fehler beim Erstellen des Ordners: ${data.error}`);
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Ordners:", error);
      setError("Fehler beim Erstellen des Ordners");
    } finally {
      setCreatingFolder(false);
    }
  }

  // Datei oder Ordner umbenennen
  async function handleRenameFolder() {
    if (!selectedNode?.path || !renameFolderName.trim()) return;
    
    // Validierung: Name darf keine Slashes enthalten
    if (/[\/]/.test(renameFolderName)) {
      setError('Der neue Name darf keine Schrägstriche oder Backslashes enthalten.');
      return;
    }
    
    setRenamingFolder(true);
    try {
      // Sicherstellen, dass der Pfad immer mit 'uploads/' beginnt
      let currentPath = selectedNode.path;
      if (!currentPath.startsWith('uploads/')) {
        currentPath = `uploads/${currentPath}`;
      }
      
      const isFile = selectedNode.type === 'file';
      const fileName = currentPath.split('/').pop() || '';
      const parentFolder = currentPath.substring(0, currentPath.length - fileName.length);
      
      // Für Dateien die Dateierweiterung beibehalten
      let newFileName = renameFolderName;
      if (isFile && fileName.includes('.') && !renameFolderName.includes('.')) {
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        newFileName = `${renameFolderName}${extension}`;
      }
      
      const oldPath = currentPath;
      const newPath = parentFolder + newFileName;
      
      const apiUrl = FILE_OPERATIONS_API;
      const apiToken = FILE_OPERATIONS_TOKEN;
      
      // Verwende die richtige Aktion basierend auf dem Dateityp
      const action = isFile ? 'rename_file' : 'rename_folder';
      
      console.log("[RenameFolder] Sending request to:", `${apiUrl}?action=${action}`);
      console.log("[RenameFolder] Old path:", oldPath);
      console.log("[RenameFolder] New path:", newPath);
      
      // Erstelle die URL mit dem action-Parameter
      const url = new URL(apiUrl);
      url.searchParams.append('action', action);
      
      // Erstelle den Body mit den Pfaden
      const formData = new URLSearchParams();
      formData.append('old', oldPath);
      formData.append('new', newPath);
      
      console.log("[RenameFolder] Request URL:", url.toString());
      console.log("[RenameFolder] Request body:", formData.toString());
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-TOKEN': apiToken
        },
        body: formData.toString()
      });
      
      // Verwende die robuste JSON-Extraktion
      const data = await safeJsonParse(response, "RenameFolder");
      
      if (data.success) {
        console.log(`${isFile ? 'Datei' : 'Ordner'} erfolgreich umbenannt:`, data);
        setRenameFolderName("");
        setShowRenameFolderDialog(false);
        
        // Zeige Erfolgsmeldung
        setError(`${isFile ? 'Datei' : 'Ordner'} erfolgreich umbenannt`);
        setTimeout(() => setError(''), 3000);
        
        // Aktualisiere die Ordnerstruktur
        await reloadFolderStructure();
        
        // Setze die Auswahl zurück
        setSelectedNode(null);
      } else {
        const errorMessage = data.error || 'Unbekannter Fehler';
        console.error(`Fehler beim Umbenennen des ${isFile ? 'der Datei' : 'Ordners'}:`, errorMessage);
        setError(`Fehler beim Umbenennen: ${errorMessage}`);
      }
    } catch (error) {
      setError("Fehler beim Umbenennen des Ordners");
    } finally {
      setRenamingFolder(false);
    }
  }

  // Datei hochladen
  async function handleFileUpload(file: File) {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      // Pfad für den Upload vorbereiten
      let uploadPath = selectedNode?.path || '';
      
      // Entferne 'uploads/' vom Anfang des Pfades, um Dopplung zu vermeiden
      uploadPath = uploadPath.replace(/^uploads\/?/, '');
      
      // Wenn der Pfad leer ist, verwende das Root-Verzeichnis
      if (uploadPath === '') {
        uploadPath = '/';
      }
      
      console.log("[FileUpload] Bereinigter Pfad:", uploadPath);
      
      console.log("[FileUpload] Uploading to path:", uploadPath);
      
      const apiUrl = FILE_OPERATIONS_API;
      const apiToken = FILE_OPERATIONS_TOKEN;
      
      // FormData für den Datei-Upload erstellen
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', uploadPath);
      
      // API-Aufruf zum Hochladen der Datei - Token als URL-Parameter
      const response = await fetch(`${apiUrl}?action=upload&token=${encodeURIComponent(apiToken)}`, {
        method: 'POST',
        body: formData
      });
      
      // Verwende die robuste JSON-Extraktion
      const data = await safeJsonParse(response, "FileUpload");
      
      if (data.success) {
        console.log("Datei erfolgreich hochgeladen:", data);
        await reloadFolderStructure();
      } else {
        console.error("Fehler beim Hochladen:", data.error);
        setError(`Fehler beim Hochladen: ${data.error}`);
      }
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      setError("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  }
  
  // Ausgewählten Ordner zum Zielordner verschieben
  async function handleMoveSelectedFolder() {
    if (!selectedNode || !targetFolder) return;
    
    setMovingFolder(true);
    setError(null);
    
    try {
      // Pfade für die Verschiebe-Operation vorbereiten
      const sourcePath = selectedNode.path;
      
      // Extrahiere den Ordnernamen aus dem Quellpfad
      const folderName = sourcePath.split('/').pop() || '';
      
      // Erstelle den vollständigen Zielpfad (Zielordner + Ordnername)
      const targetPath = targetFolder === 'uploads' 
        ? `uploads/${folderName}` 
        : `${targetFolder}/${folderName}`;
      
      console.log(`Verschiebe von '${sourcePath}' nach '${targetPath}'`);
      
      // Verschieben durchführen
      const success = await handleMoveFolder(sourcePath, targetPath);
      
      if (success) {
        setShowMoveDialog(false);
        setSelectedNode(null);
      }
    } catch (error) {
      console.error("Fehler beim Verschieben:", error);
      setError("Fehler beim Verschieben");
    } finally {
      setMovingFolder(false);
    }
  }
  
  // Element (Ordner oder Datei) verschieben API-Aufruf
  async function handleMoveFolder(sourcePath: string, targetPath: string) {
    if (!sourcePath || !targetPath) return;
    
    try {
      // Sicherstellen, dass die Pfade immer mit 'uploads/' beginnen
      let source = sourcePath;
      let target = targetPath;
      
      if (!source.startsWith('uploads/')) {
        source = `uploads/${source}`;
      }
      
      if (!target.startsWith('uploads/')) {
        target = `uploads/${target}`;
      }
      
      console.log("[MoveFolder] Moving from:", source, "to:", target);
      
      const apiUrl = FILE_OPERATIONS_API;
      const apiToken = FILE_OPERATIONS_TOKEN;
      
      const requestBody = `source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`;
      console.log("[MoveFolder] Request Body:", requestBody);
      
      // Prüfe, ob es sich um eine Datei oder einen Ordner handelt
      const isFile = source.includes('.') && !source.endsWith('/');
      const action = isFile ? 'move_file' : 'move_folder';
      
      console.log(`[Move] Erkannt als ${isFile ? 'Datei' : 'Ordner'}, verwende API-Aktion: ${action}`);
      
      // API-Aufruf zum Verschieben
      const response = await fetch(`${apiUrl}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-TOKEN': apiToken
        },
        body: requestBody
      });
      
      // Verwende die robuste JSON-Extraktion
      const data = await safeJsonParse(response, "MoveFolder");
      
      if (data.success) {
        console.log("Ordner erfolgreich verschoben:", data);
        await reloadFolderStructure();
        return true;
      } else {
        console.error("Fehler beim Verschieben:", data.error);
        setError(`Fehler beim Verschieben: ${data.error}`);
        return false;
      }
    } catch (error) {
      console.error("Fehler beim Verschieben:", error);
      setError("Fehler beim Verschieben");
      return false;
    }
  }
  
  // Element (Ordner oder Datei) löschen
  async function handleDeleteFolder() {
    if (!selectedNode) return;
    
    try {
      setDeletingFolder(true);
      setError("");
      
      console.log("Lösche Element:", selectedNode.path);
      
      // Sicherstellen, dass der Pfad immer mit 'uploads/' beginnt
      let path = selectedNode.path;
      if (!path.startsWith('uploads/')) {
        path = `uploads/${path}`;
      }
      
      const apiUrl = FILE_OPERATIONS_API;
      const apiToken = FILE_OPERATIONS_TOKEN;
      
      // Prüfe, ob es sich um eine Datei oder einen Ordner handelt
      const isFile = selectedNode.type === 'file' || (path.includes('.') && !path.endsWith('/'));
      const action = isFile ? 'delete_by_path' : 'delete_folder';
      
      console.log(`[Delete] Erkannt als ${isFile ? 'Datei' : 'Ordner'}, verwende API-Aktion: ${action}`);
      
      // API-Aufruf zum Löschen
      const requestBody = `path=${encodeURIComponent(path)}`;
      console.log("[DeleteFolder] Request Body:", requestBody);
      
      // POST-Methode zum Löschen
      const response = await fetch(`${apiUrl}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-TOKEN': apiToken
        },
        body: requestBody
      });
      
      // Verwende die robuste JSON-Extraktion
      const data = await safeJsonParse(response, "DeleteFolder");
      
      if (data.success) {
        // Aktualisiere die Baumstruktur nach dem Löschen
        await reloadFolderStructure();
        setShowDeleteConfirmDialog(false);
        setSelectedNode(null);
        console.log("Erfolgreich gelöscht:", data);
      } else if (data.error) {
        console.error("Fehler beim Löschen:", data.error);
        setError(`Fehler beim Löschen: ${data.error}`);
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      setError("Fehler beim Löschen");
    } finally {
      setDeletingFolder(false);
    }
  }

  // State für mobile Erkennung
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePadding, setMobilePadding] = useState(40);
  
  // Effekt zur Erkennung von mobilen Geräten
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setMobilePadding(mobile ? 20 : 40);
    };
    
    // Initial check
    checkMobile();
    
    // Event listener für Größenänderungen
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Container-Styles mit Responsiveness
  const containerStyle = {
    maxWidth: isMobile ? "100%" : 900,
    margin: "0 auto",
    padding: mobilePadding,
    background: "var(--color-bg-panel)",
    color: "#fff",
    overflowX: "hidden" as const,
    boxSizing: "border-box" as "border-box",
    width: isMobile ? "100%" : "auto"
  };
  
  // Styles für die Aktionsleiste
  const actionBarStyle = {
    display: "flex",
    flexWrap: isMobile ? "wrap" : "nowrap" as "wrap" | "nowrap",
    gap: isMobile ? "6px" : "10px",
    justifyContent: "center",
    marginBottom: isMobile ? "10px" : "20px",
    maxWidth: "100%",
    overflowX: "hidden" as "hidden"
  };
  
  // Styles für Buttons im Header-Stil
  const buttonStyle = {
    flex: isMobile ? "1 0 calc(50% - 10px)" : "auto",
    minWidth: isMobile ? "auto" : "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#00e1ff",
    fontSize: "0.875rem",
    fontWeight: 600,
    padding: "0.3rem 0.5rem",
    borderRadius: "15px",
    border: "1px solid rgba(0, 225, 255, 0.2)",
    backgroundColor: "rgba(0, 225, 255, 0.1)",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
    transition: "all 0.2s"
  };

  // Verstecktes File-Input-Element für den Upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Funktion zum Öffnen des Datei-Dialogs
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Funktion zum Verarbeiten der ausgewählten Dateien
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Alle ausgewählten Dateien nacheinander hochladen
      Array.from(files).forEach(file => {
        handleFileUpload(file);
      });
    }
    // Reset input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.adminNavContainer}>
        <AdminNav />
      </div>
      <h1 className={styles.adminTitle}>Ordnerverwaltung</h1>
      {/* Der komplette Seiteninhalt folgt hier */}

      <h1 style={{ 
        color: "var(--color-primary-500)", 
        textAlign: "center", 
        marginBottom: isMobile ? 10 : 30,
        fontSize: isMobile ? "1.5rem" : "2rem"
      }}>
        
      </h1>

      <div style={{ 
        textAlign: "center", 
        marginBottom: isMobile ? 10 : 20, 
        fontSize: 14, 
        color: "#999" 
      }}>
        Durchsuchter Pfad: <code style={{ background: "#333", padding: "2px 6px", borderRadius: 4 }}>uploads</code>
      </div>

      <div style={actionBarStyle}>
        <button 
          onClick={() => setShowNewFolderDialog(true)}
          style={{
            ...buttonStyle,
            
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          Neuer Ordner
        </button>
        
        <button 
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          style={{
            ...buttonStyle
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Datei hochladen
        </button>
        
        <button 
          onClick={() => {
            if (selectedNode) {
              setRenameFolderName(selectedNode.name);
              setShowRenameFolderDialog(true);
            } else {
              setError("Bitte wähle zuerst einen Ordner aus");
            }
          }}
          style={{
            ...buttonStyle
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Umbenennen
        </button>
        
        <button 
          onClick={() => {
            if (selectedNode) {
              setShowMoveDialog(true);
            } else {
              setError("Bitte wähle zuerst einen Ordner oder eine Datei aus");
            }
          }}
          style={{
            ...buttonStyle
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Verschieben
        </button>
        
        <button 
          onClick={() => {
            if (selectedNode) {
              setShowDeleteConfirmDialog(true);
            } else {
              setError("Bitte wähle zuerst einen Ordner oder eine Datei aus");
            }
          }}
          style={{
            ...buttonStyle,
            border: "1px solid rgba(255, 77, 79, 0.3)",
            
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Löschen
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", marginTop: 30 }}>Lade Ordnerstruktur...</div>
      ) : error ? (
        <div style={{ color: "red", textAlign: "center", marginTop: 30 }}>{error}</div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <FolderTree
            items={tree}
            currentNode={selectedNode}
            setCurrentNode={setSelectedNode}
          />
        </div>
      )}

      {/* Dialog zum Erstellen eines neuen Ordners */}
      {showNewFolderDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "var(--color-bg-panel)",
            padding: 30,
            borderRadius: 16,
            width: 400
          }}>
            <h2 style={{ color: "var(--color-primary-500)", marginBottom: 20 }}>
              Neuen Ordner erstellen
            </h2>
            {selectedNode && (
              <div style={{ marginBottom: 15, fontSize: 14, color: "#999" }}>
                In Ordner: <span style={{ color: "#fff" }}>{selectedNode.name}</span>
              </div>
            )}
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 20,
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                color: "#fff"
              }}
              placeholder="Ordnername"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowNewFolderDialog(false)}
                style={{
                  padding: "8px 16px",
                  background: "#333",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                style={{
                  padding: "8px 16px",
                  background: "var(--color-primary-500)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: creatingFolder || !newFolderName.trim() ? "not-allowed" : "pointer",
                  opacity: creatingFolder || !newFolderName.trim() ? 0.7 : 1
                }}
              >
                {creatingFolder ? "Erstelle..." : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog zum Umbenennen eines Ordners */}
      {showRenameFolderDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "var(--color-bg-panel)",
            padding: 30,
            borderRadius: 16,
            width: 400
          }}>
            <h2 style={{ color: "var(--color-primary-500)", marginBottom: 20 }}>
              Ordner umbenennen
            </h2>
            <div style={{ marginBottom: 15, fontSize: 14, color: "#999" }}>
              Ordnername: <span style={{ color: "#fff" }}>{selectedNode?.path.split('/').pop()}</span>
            </div>
            <input
              type="text"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 20,
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                color: "#fff"
              }}
              placeholder="Neuer Ordnername"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowRenameFolderDialog(false)}
                style={{
                  padding: "8px 16px",
                  background: "#333",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleRenameFolder}
                disabled={!renameFolderName.trim() || renamingFolder}
                style={{
                  padding: "8px 16px",
                  background: "var(--color-primary-500)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: renamingFolder || !renameFolderName.trim() ? "not-allowed" : "pointer",
                  opacity: renamingFolder || !renameFolderName.trim() ? 0.7 : 1
                }}
              >
                {renamingFolder ? "Benenne um..." : "Umbenennen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog zum Verschieben eines Ordners */}
      {showMoveDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "var(--color-bg-panel)",
            padding: 30,
            borderRadius: 16,
            width: 400
          }}>
            <h2 style={{ marginBottom: 15, fontSize: 18, color: "#fff" }}>
              Ordner verschieben
            </h2>
            <div style={{ marginBottom: 15, fontSize: 14, color: "#999" }}>
              Quellordner: <span style={{ color: "#fff" }}>{selectedNode?.path}</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: "#999" }}>
                Zielordner auswählen:
              </label>
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                  color: "#fff"
                }}
              >
                <option value="">-- Bitte wählen --</option>
                <option value="uploads">Root (uploads)</option>
                {/* Rekursive Funktion zum Extrahieren aller Ordner und Unterordner */}
                {(() => {
                  // Sammle alle Ordner und Unterordner rekursiv
                  const allFolders: string[] = [];
                  
                  // Rekursive Funktion zum Sammeln aller Ordner
                  const collectFolders = (nodes: FileNode[], parentPath: string = '') => {
                    nodes.forEach(node => {
                      if (node.type === 'folder') {
                        // Füge den aktuellen Ordner hinzu
                        allFolders.push(node.path);
                        
                        // Rekursiv Unterordner durchlaufen
                        if (node.children && node.children.length > 0) {
                          collectFolders(node.children, node.path);
                        }
                      }
                    });
                  };
                  
                  // Starte die rekursive Sammlung
                  collectFolders(tree);
                  
                  // Sortiere die Ordner alphabetisch
                  allFolders.sort();
                  
                  // Gib die Optionen zurück
                  return allFolders.map(folderPath => {
                    // Verhindere, dass ein Ordner in sich selbst oder einen Unterordner verschoben wird
                    if (selectedNode && 
                        !folderPath.startsWith(selectedNode.path) && 
                        folderPath !== selectedNode.path) {
                      return (
                        <option key={folderPath} value={folderPath}>
                          {folderPath}
                        </option>
                      );
                    }
                    return null;
                  });
                })()}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowMoveDialog(false)}
                style={{
                  padding: "8px 16px",
                  background: "#333",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleMoveSelectedFolder}
                disabled={!targetFolder || movingFolder}
                style={{
                  padding: "8px 16px",
                  background: "var(--color-primary-500)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: !targetFolder || movingFolder ? "not-allowed" : "pointer",
                  opacity: !targetFolder || movingFolder ? 0.7 : 1
                }}
              >
                {movingFolder ? "Verschiebe..." : "Verschieben"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dialog zum Bestätigen des Löschens */}
      {showDeleteConfirmDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "var(--color-bg-panel)",
            padding: 30,
            borderRadius: 16,
            width: 400
           }}>
            <h2 style={{ marginBottom: 15, fontSize: 18, color: "#fff" }}>Löschen bestätigen</h2>
            <p style={{ marginBottom: 20, fontSize: 14, color: "#fff" }}>
              Möchtest du {selectedNode?.type === 'folder' ? 'den Ordner' : 'die Datei'} <b>{selectedNode?.name}</b> wirklich löschen?
              {selectedNode?.type === 'folder' && (
                <>
                  <br />
                  <br />
                  <span style={{ color: "#f66", fontWeight: 600 }}>
                    Achtung: Alle Unterordner und Dateien werden ebenfalls gelöscht!
                  </span>
                </>
              )}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirmDialog(false)}
                style={{
                  padding: "8px 16px",
                  background: "#333",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteFolder}
                disabled={deletingFolder}
                style={{
                  padding: "8px 16px",
                  background: "#ff6b6b",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: deletingFolder ? "not-allowed" : "pointer",
                  opacity: deletingFolder ? 0.7 : 1
                }}
              >
                {deletingFolder ? "Lösche..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Verstecktes Datei-Input-Element für den Upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        multiple
      />
    </div>
  );
}
