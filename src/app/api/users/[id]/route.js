import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Baserow API Konfiguration
// Wir erzwingen die Verwendung von Baserow, unabhängig von der USE_BASEROW-Einstellung
const USE_BASEROW = true; // Immer Baserow verwenden
const BASEROW_API_URL = process.env.BASEROW_API_URL || "https://api.baserow.io/api";
const BASEROW_USER_TABLE_ID = process.env.BASEROW_USER_TABLE_ID || "599962";
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_URL = `${BASEROW_API_URL}/database/rows/table/${BASEROW_USER_TABLE_ID}/`;

console.log("[id]/route.js - Baserow-Konfiguration:", {
  API_URL: BASEROW_API_URL,
  USER_TABLE_ID: BASEROW_USER_TABLE_ID,
  TOKEN: BASEROW_TOKEN ? "Vorhanden" : "Nicht vorhanden"
});

// Feldnamen aus der Benutzer-Tabelle
const FIELD_MAP = {
  username: process.env.BASEROW_FIELD_USERNAME || "field_4858571",
  password: process.env.BASEROW_FIELD_PASSWORT || "field_4858573",
  role: process.env.BASEROW_FIELD_ROLE || "field_4858572",
  email: process.env.BASEROW_FIELD_EMAIL || "field_4858574",
};

// Rolle-Mapping zwischen Frontend-Strings und Baserow-Werten
// In Baserow sind die Rollen als Strings "admin" und "user" gespeichert
const ROLE_MAP = { admin: "admin", user: "user" };

// Umgekehrtes Mapping für die Konvertierung von Baserow-Werten zu Strings
const ROLE_MAP_REVERSE = {};
Object.entries(ROLE_MAP).forEach(([key, value]) => {
  ROLE_MAP_REVERSE[value] = key;
});

// Hilfsfunktion: Prüft, ob der Benutzer angemeldet und ein Admin ist
async function checkAdminAuth(req) {
  try {
    // Cookie auslesen
    const sessionCookie = req.cookies.get('tubox_session')?.value;
    
    // Wenn kein Cookie vorhanden ist, ist der Benutzer nicht eingeloggt
    if (!sessionCookie) {
      return { isAuthorized: false, error: "Nicht eingeloggt" };
    }
    
    try {
      // Session-Daten dekodieren
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
      
      // Prüfe, ob die Session-Daten vollständig sind und der Benutzer ein Admin ist
      if (!sessionData.username || !sessionData.email || sessionData.role !== "admin") {
        return { isAuthorized: false, error: "Nicht autorisiert" };
      }
      
      return { isAuthorized: true, user: sessionData };
    } catch (parseError) {
      console.error("Fehler beim Dekodieren der Session-Daten:", parseError);
      return { isAuthorized: false, error: "Ungültige Session-Daten" };
    }
  } catch (error) {
    console.error("Fehler bei der Authentifizierungsprüfung:", error);
    return { isAuthorized: false, error: "Interner Serverfehler bei der Authentifizierung" };
  }
}

// GET: Einen einzelnen Benutzer abrufen
export async function GET(req, { params }) {
  const { id } = params;
  
  // Prüfe, ob der Benutzer ein Admin ist
  const authCheck = await checkAdminAuth(req);
  if (!authCheck.isAuthorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 });
  }
  
  try {
    // Benutzer von Baserow abrufen
    const response = await fetch(`${BASEROW_URL}${id}/`, {
      method: "GET",
      headers: {
        "Authorization": `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: `Fehler beim Abrufen des Benutzers: ${errorData.error || response.statusText}` }, { status: response.status });
    }
    
    const userData = await response.json();
    
    // Benutzer-Objekt formatieren (ohne Passwort)
    const roleValue = userData[FIELD_MAP.role];
    console.log(`[id]/route.js - GET - Rolle aus Baserow: ${roleValue}, Typ: ${typeof roleValue}`);
    
    // Konvertiere die Rolle von Baserow-Wert zu String
    let roleString = "user"; // Standardwert
    
    try {
      if (roleValue !== undefined) {
        // Da wir jetzt String-Werte in Baserow haben, können wir den Wert direkt verwenden
        if (roleValue === "admin" || roleValue === "user") {
          roleString = roleValue;
          console.log(`[id]/route.js - GET - Rolle direkt übernommen: ${roleString}`);
        } else if (ROLE_MAP_REVERSE[roleValue]) {
          // Fallback für den Fall, dass wir noch numerische Werte haben
          roleString = ROLE_MAP_REVERSE[roleValue];
          console.log(`[id]/route.js - GET - Konvertierte Rolle: ${roleString}`);
        } else {
          console.warn(`[id]/route.js - GET - Unbekannte Rolle: ${roleValue}, verwende Standardwert 'user'`);
        }
      }
    } catch (error) {
      console.error(`[id]/route.js - GET - Fehler bei der Rolle-Konvertierung:`, error);
    }
    
    const user = {
      id: userData.id,
      username: userData[FIELD_MAP.username],
      email: userData[FIELD_MAP.email],
      role: roleString
    };
    
    return NextResponse.json(user);
  } catch (error) {
    console.error("Fehler beim Abrufen des Benutzers:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PUT: Einen Benutzer aktualisieren
export async function PUT(req, { params }) {
  const { id } = params;
  
  // Prüfe, ob der Benutzer ein Admin ist
  const authCheck = await checkAdminAuth(req);
  if (!authCheck.isAuthorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 });
  }
  
  try {
    // Daten aus dem Request-Body lesen
    const data = await req.json();
    
    // Daten validieren
    if (!data.username || !data.email || !data.role) {
      return NextResponse.json({ error: "Unvollständige Daten" }, { status: 400 });
    }
    
    // Daten für Baserow formatieren
    const baserowData = {
      [FIELD_MAP.username]: data.username,
      [FIELD_MAP.email]: data.email
    };
    
    // Konvertiere die Rolle von String zu Baserow-Wert
    console.log(`[id]/route.js - PUT - Rolle aus Frontend: ${data.role}, Typ: ${typeof data.role}`);
    
    try {
      // Da wir jetzt String-Werte in Baserow haben, können wir den Wert direkt verwenden
      if (data.role === "admin" || data.role === "user") {
        baserowData[FIELD_MAP.role] = data.role;
        console.log(`[id]/route.js - PUT - Rolle direkt übernommen: ${data.role}`);
      } else {
        // Fallback für unbekannte Rollen
        console.warn(`[id]/route.js - PUT - Unbekannte Rolle: ${data.role}, verwende Standardwert 'user'`);
        baserowData[FIELD_MAP.role] = "user"; // Standardwert
      }
    } catch (error) {
      console.error(`[id]/route.js - PUT - Fehler bei der Rolle-Konvertierung:`, error);
      baserowData[FIELD_MAP.role] = "user"; // Standardwert bei Fehler
    }
    
    // Wenn ein neues Passwort gesetzt werden soll
    if (data.password && data.password.trim() !== "") {
      // Passwort hashen
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      baserowData[FIELD_MAP.password] = hashedPassword;
    }
    
    // Benutzer in Baserow aktualisieren
    const response = await fetch(`${BASEROW_URL}${id}/`, {
      method: "PATCH",
      headers: {
        "Authorization": `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(baserowData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: `Fehler beim Aktualisieren des Benutzers: ${errorData.error || response.statusText}` }, { status: response.status });
    }
    
    const updatedUser = await response.json();
    
    // Aktualisiertes Benutzer-Objekt formatieren (ohne Passwort)
    const roleValue = updatedUser[FIELD_MAP.role];
    console.log(`[id]/route.js - PUT - Rolle aus Baserow nach Update: ${roleValue}, Typ: ${typeof roleValue}`);
    
    // Konvertiere die Rolle von Baserow-Wert zu String
    let roleString = "user"; // Standardwert
    
    try {
      if (roleValue !== undefined) {
        // Da wir jetzt String-Werte in Baserow haben, können wir den Wert direkt verwenden
        if (roleValue === "admin" || roleValue === "user") {
          roleString = roleValue;
          console.log(`[id]/route.js - PUT - Rolle direkt übernommen nach Update: ${roleString}`);
        } else if (ROLE_MAP_REVERSE[roleValue]) {
          // Fallback für den Fall, dass wir noch numerische Werte haben
          roleString = ROLE_MAP_REVERSE[roleValue];
          console.log(`[id]/route.js - PUT - Konvertierte Rolle nach Update: ${roleString}`);
        } else {
          console.warn(`[id]/route.js - PUT - Unbekannte Rolle nach Update: ${roleValue}, verwende Standardwert 'user'`);
        }
      }
    } catch (error) {
      console.error(`[id]/route.js - PUT - Fehler bei der Rolle-Konvertierung nach Update:`, error);
    }
    
    const user = {
      id: updatedUser.id,
      username: updatedUser[FIELD_MAP.username],
      email: updatedUser[FIELD_MAP.email],
      role: roleString
    };
    
    return NextResponse.json({ message: "Benutzer erfolgreich aktualisiert", user });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Benutzers:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE: Einen Benutzer löschen
export async function DELETE(req, { params }) {
  const { id } = params;
  
  // Prüfe, ob der Benutzer ein Admin ist
  const authCheck = await checkAdminAuth(req);
  if (!authCheck.isAuthorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 });
  }
  
  try {
    // Benutzer in Baserow löschen
    const response = await fetch(`${BASEROW_URL}${id}/`, {
      method: "DELETE",
      headers: {
        "Authorization": `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: `Fehler beim Löschen des Benutzers: ${errorData.error || response.statusText}` }, { status: response.status });
    }
    
    return NextResponse.json({ message: "Benutzer erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Benutzers:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
