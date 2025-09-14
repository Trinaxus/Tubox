# Tubox Next.js Galerie

Eine moderne, responsive Galerie-Anwendung für Fotos und Videos, erstellt mit Next.js, TypeScript und Tailwind CSS.

## 🚀 Features

- 📸 Unterstützung für Bilder und Videos
- 🎥 Automatische Video-Erkennung
- 🔒 Passwortgeschützte Galerien
- 📱 Responsive Design
- ⚡ Optimierte Ladezeiten
- 🎨 Benutzerfreundliche Oberfläche
- 🔍 Erweiterte Suchfunktionen

## 🛠️ Technologien

- [Next.js](https://nextjs.org/) - Das React-Framework für die Produktion
- [TypeScript](https://www.typescriptlang.org/) - Typensicheres JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS Framework
- [Framer Motion](https://www.framer.com/motion/) - Animationen und Übergänge
- [NextAuth.js](https://next-auth.js.org/) - Authentifizierung

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18.0.0 oder höher
- npm oder yarn

### Installation

1. Repository klonen:
   ```bash
   git clone [repository-url]
   cd tubox.de-next
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   # oder
   yarn install
   ```

3. Umgebungsvariablen einrichten:
   Erstellen Sie eine `.env.local` Datei im Hauptverzeichnis mit folgenden Variablen:
   ```
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   # Weitere erforderliche Umgebungsvariablen
   ```

4. Entwicklungsserver starten:
   ```bash
   npm run dev
   # oder
   yarn dev
   ```

5. Öffnen Sie [http://localhost:3000](http://localhost:3000) in Ihrem Browser.

## 📁 Projektstruktur

```
src/
├── app/                    # App Router
│   ├── api/                # API-Routen
│   ├── components/         # Wiederverwendbare Komponenten
│   ├── gallery/            # Galerie-Komponenten
│   └── styles/             # Globale Styles
├── public/                 # Statische Dateien
└── types/                  # TypeScript Typdefinitionen
```

## 📝 Upload-Funktionalität

Die Anwendung unterstützt das Hochladen von Bildern und Videos:

- Bilder werden automatisch erkannt und in der Galerie angezeigt
- Videos können in speziellen Video-Galerien hochgeladen werden
- Automatische Thumbnail-Erstellung für Videos
- Unterstützung für Metadaten (Jahr, Kategorie, Tags)

## 🌐 Server-API

Die Anwendung bietet eine REST-API für Datei- und Ordneroperationen:

### Dateioperationen
- `POST /api/upload` - Hochladen von Dateien
  - Parameter: `file` (Datei), `year`, `gallery`, `category`
  - Erstellt automatisch Thumbnails für Bilder und Videos

### Ordneroperationen
- `GET /api/folders` - Liste aller verfügbaren Ordner abrufen
- `POST /api/folders` - Neuen Ordner erstellen
  - Parameter: `path` (Pfad des neuen Ordners)
- `DELETE /api/folders` - Ordner löschen
  - Parameter: `path` (Pfad des zu löschenden Ordners)

### Galerieoperationen
- `GET /api/galleries` - Liste aller Galerien abrufen
- `GET /api/galleries/[galleryId]` - Details einer bestimmten Galerie abrufen
- `POST /api/galleries` - Neue Galerie erstellen
  - Parameter: `name`, `description`, `isPrivate`

### Beispielfunktionen

```typescript
// Ordner erstellen
const createFolder = async (path: string) => {
  const response = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  return await response.json();
};

// Datei hochladen
const uploadFile = async (file: File, year: string, gallery: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('year', year);
  formData.append('gallery', gallery);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  return await response.json();
};
```

### Authentifizierung

Die meisten API-Endpunkte erfordern eine gültige Authentifizierung. Fügen Sie den Authentifizierungs-Token im `Authorization`-Header hinzu:

```
Authorization: Bearer [IHR_TOKEN]
```

### Fehlerbehandlung

Die API gibt standardisierte Fehlermeldungen im folgenden Format zurück:

```json
{
  "success": false,
  "error": "Fehlermeldung",
  "code": "ERROR_CODE"
}
```

Mögliche Fehlercodes:
- `UNAUTHORIZED` - Nicht authentifiziert
- `FORBIDDEN` - Keine Berechtigung
- `NOT_FOUND` - Ressource nicht gefunden
- `VALIDATION_ERROR` - Ungültige Eingabedaten
- `INTERNAL_ERROR` - Serverfehler

## 🔒 Authentifizierung

Die Anwendung verwendet NextAuth.js für die Authentifizierung. Folgende Authentifizierungsmethoden sind verfügbar:

- E-Mail/Passwort
- OAuth-Provider (Google, GitHub, etc.)

## 🌐 Deployment

Die Anwendung kann auf verschiedenen Plattformen bereitgestellt werden:

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- Eigenes Hosting mit Node.js

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Ftubox.de-next)

## 📄 Lizenz

Dieses Projekt ist lizenziert unter der MIT-Lizenz - siehe die [LICENSE](LICENSE) Datei für Details.

## 🙋‍♂️ Unterstützung

Bei Fragen oder Problemen öffnen Sie bitte ein [Issue](https://github.com/your-username/tubox.de-next/issues).

## 🤝 Mitwirkende

- [Ihr Name](https://github.com/your-username)

## 📝 Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für Änderungen und Versionshistorie.
