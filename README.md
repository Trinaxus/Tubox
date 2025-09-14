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
- PHP-Backend für Dateioperationen und Blog-JSON (extern)

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
   - Nutzen Sie die bereitgestellte `env.example` als Vorlage und erstellen Sie daraus Ihre `.env.local`.
   - Wichtige Variablen (Auszug):
     - `SITE_URL`, `NEXT_PUBLIC_SITE_URL`
     - `SERVER_BASE_URL`, `NEXT_PUBLIC_SERVER_BASE_URL`
     - `NEXT_PUBLIC_UPLOADS_BASE_URL`, `NEXT_PUBLIC_UPLOAD_ENDPOINT`
     - `USE_EXTERNAL=true`, `EXTERNAL_BLOG_URL`, `UPDATE_BLOG_PHP_URL`
     - Admin-Login ohne DB: `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME` und ENTWEDER `ADMIN_PASSWORD` (Dev) ODER `ADMIN_PASSWORD_HASH` (Prod)

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

## 📝 Externes Blog & PHP-Server

- Blog-Daten (Index + einzelne Posts) werden in Produktion aus einem externen JSON-Verzeichnis gelesen: `EXTERNAL_BLOG_URL`.
- Änderungen (Erstellen/Updaten/Löschen) werden über deinen PHP-Endpoint ausgeführt: `UPDATE_BLOG_PHP_URL`.
- In der Entwicklung kann lokal aus `public/uploads/blog/` gelesen/geschrieben werden.

## 🔒 Authentifizierung

Die Admin-Anmeldung erfolgt ohne Datenbank über ENV-Variablen in `src/app/api/login/route.ts`:

- Identität: `ADMIN_EMAIL` (oder `ADMIN_USERNAME`)
- Passwort: ENTWEDER `ADMIN_PASSWORD_HASH` (bcrypt, empfohlen) ODER `ADMIN_PASSWORD` (nur Dev)

Hinweis: Es gibt keine Registrierung mehr in der App. Zugangsdaten werden serverseitig über ENV gepflegt.

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
