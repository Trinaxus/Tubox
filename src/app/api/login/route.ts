import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Login ohne Datenbank: Admin-Credentials aus ENV
// Unterstützte Variablen:
// - ADMIN_EMAIL (optional, alternativ ADMIN_USERNAME)
// - ADMIN_USERNAME (optional, falls keine E-Mail gewünscht)
// - ADMIN_PASSWORD (Klartext) ODER ADMIN_PASSWORD_HASH (bcrypt-Hash)
// - ADMIN_DISPLAY_NAME (optional, Anzeigename)
// Hinweise:
// Für Produktion empfiehlt sich ADMIN_PASSWORD_HASH. Erstellen z. B. mit:
//   node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" <PASSWORT>
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // Klartext (nur Dev)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // bcrypt-Hash
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "Admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username } = body;

    // Minimalvalidierung
    if ((!email && !username) || !password) {
      return NextResponse.json({ error: "E-Mail/Username und Passwort erforderlich" }, { status: 400 });
    }

    // Erwartete Identität aus ENV
    const loginIdInput = (email || username || "").toString().trim().toLowerCase();
    const expectedEmail = (ADMIN_EMAIL || "").toString().trim().toLowerCase();
    const expectedUsername = (ADMIN_USERNAME || "").toString().trim().toLowerCase();

    const idMatches = loginIdInput === expectedEmail || loginIdInput === expectedUsername;
    if (!idMatches) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 401 });
    }

    // Passwortprüfung: bevorzugt Hash, sonst Klartext
    let isPasswordValid = false;
    if (ADMIN_PASSWORD_HASH) {
      try {
        isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      } catch (e) {
        console.error("Fehler beim bcrypt-Vergleich:", e);
        return NextResponse.json({ error: "Serverfehler bei Passwortprüfung" }, { status: 500 });
      }
    } else if (ADMIN_PASSWORD) {
      isPasswordValid = password === ADMIN_PASSWORD;
    } else {
      return NextResponse.json({ error: "Serverseitige Admin-Credentials nicht konfiguriert" }, { status: 500 });
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
    }

    // Erfolgreiche Anmeldung: Session-Daten zusammenstellen
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const timestamp = Date.now();

    const userData = {
      username: ADMIN_DISPLAY_NAME || ADMIN_USERNAME || "Admin",
      email: ADMIN_EMAIL || "admin@example.com",
      role: "admin" as const,
      sessionId,
      timestamp,
    };

    const response = NextResponse.json({ success: true, user: userData });

    // Cache-Control-Header setzen, um Caching zu verhindern
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    // Session-Cookie setzen (kompatibel mit /api/auth/me und AuthCheck)
    response.cookies.set(
      "tubox_session",
      encodeURIComponent(JSON.stringify(userData)),
      {
        httpOnly: false, // falls Client JS darauf zugreifen soll; für höhere Sicherheit auf true setzen und AuthCheck anpassen
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60, // 24 Stunden
      }
    );

    console.log(`Login erfolgreich: ${userData.username} (${userData.email}) mit Rolle ${userData.role} und Session-ID ${sessionId}`);

    return response;
  } catch (error) {
    console.error("Login API Fehler:", error);
    return NextResponse.json(
      { error: `Server-Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}` },
      { status: 500 }
    );
  }
}
