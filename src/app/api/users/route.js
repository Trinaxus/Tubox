import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Baserow API Konfiguration
// Wir erzwingen die Verwendung von Baserow, unabhängig von der USE_BASEROW-Einstellung
const USE_BASEROW = true; // Immer Baserow verwenden
const BASEROW_API_URL = process.env.BASEROW_API_URL || "https://api.baserow.io/api";
const BASEROW_USER_TABLE_ID = process.env.BASEROW_USER_TABLE_ID || "599962";
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_URL = `${BASEROW_API_URL}/database/rows/table/${BASEROW_USER_TABLE_ID}/`;

console.log("Baserow-Konfiguration:", {
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
    console.log("Session-Cookie:", sessionCookie ? "vorhanden" : "nicht vorhanden");
    
    // Wenn kein Cookie vorhanden ist, ist der Benutzer nicht eingeloggt
    if (!sessionCookie) {
      return { isAuthorized: false, error: "Nicht eingeloggt" };
    }
    
    try {
      // Session-Daten dekodieren
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
      console.log("Session-Daten:", sessionData);
      
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

// GET /api/users - Alle Benutzer abrufen
export async function GET(req) {
  try {
    // Prüfe, ob der Benutzer ein Admin ist
    const authCheck = await checkAdminAuth(req);
    if (!authCheck.isAuthorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }
    
    console.log("Rufe Benutzer aus Baserow ab...");
    
    if (!BASEROW_TOKEN) {
      console.error("BASEROW_TOKEN fehlt! Kann keine Benutzer abrufen.");
      return NextResponse.json({ error: "Baserow API-Token fehlt" }, { status: 500 });
    }
    
    // Benutzer von Baserow abrufen
    const response = await fetch(BASEROW_URL, {
      method: "GET",
      headers: {
        "Authorization": `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json"
      },
      cache: "no-store" // Stellt sicher, dass wir immer aktuelle Daten bekommen
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: `Fehler beim Abrufen der Benutzer: ${errorData.error || response.statusText}` }, { status: response.status });
    }
    
    const data = await response.json();
    console.log("Baserow-Antwort:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Benutzer-Objekte formatieren (ohne Passwörter)
    const users = data.results.map(user => {
      const roleValue = user[FIELD_MAP.role];
      console.log(`GET - Benutzer ${user.id} - Rolle aus Baserow: ${roleValue}, Typ: ${typeof roleValue}`);
      
      // Standardwert für die Rolle
      let roleString = "user";
      
      // Versuche, die Rolle zu konvertieren
      try {
        if (roleValue !== undefined) {
          if (ROLE_MAP_REVERSE[roleValue]) {
            roleString = ROLE_MAP_REVERSE[roleValue];
            console.log(`GET - Benutzer ${user.id} - Konvertierte Rolle: ${roleString}`);
          } else {
            console.warn(`GET - Benutzer ${user.id} - Unbekannte Rolle: ${roleValue}, verwende Standardwert 'user'`);
          }
        }
      } catch (error) {
        console.error(`GET - Fehler bei der Rolle-Konvertierung für Benutzer ${user.id}:`, error);
      }
      
      console.log(`Rolle konvertiert: ${roleValue} -> ${roleString}`);
      
      return {
        id: user.id,
        username: user[FIELD_MAP.username],
        email: user[FIELD_MAP.email],
        role: roleString
      };
    });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fehler beim Abrufen der Benutzer:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/users - Neuen Benutzer erstellen
export async function POST(req) {
  try {
    // Prüfen, ob der Benutzer angemeldet und ein Admin ist
    const auth = await checkAdminAuth(req);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { username, email, password, role } = body;

    // Validierung
    if (!username || !email || !password || !role) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich" }, { status: 400 });
    }

    // Prüfen, ob E-Mail bereits existiert
    const checkUrl = `${BASEROW_URL}?user_field_names=true&filter_e-mail__equal=${encodeURIComponent(email)}`;
    const checkResponse = await fetch(checkUrl, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      cache: "no-store",
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error(`Baserow API-Fehler: ${checkResponse.status} ${errorText}`);
      return NextResponse.json({ error: "Fehler bei der E-Mail-Überprüfung" }, { status: 500 });
    }

    const checkData = await checkResponse.json();
    if (checkData.count > 0) {
      return NextResponse.json({ error: "E-Mail wird bereits verwendet" }, { status: 400 });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // Neuen Benutzer in Baserow erstellen
    const createUrl = `${BASEROW_URL}?user_field_names=true`;
    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        [FIELD_MAP.username]: username,
        [FIELD_MAP.email]: email,
        [FIELD_MAP.password]: hashedPassword,
        [FIELD_MAP.role]: role,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`Baserow API-Fehler: ${createResponse.status} ${errorText}`);
      return NextResponse.json({ error: "Fehler beim Erstellen des Benutzers" }, { status: 500 });
    }

    const newUser = await createResponse.json();
    return NextResponse.json({
      message: "Benutzer erfolgreich erstellt",
      user: {
        id: newUser.id,
        username: newUser[FIELD_MAP.username],
        email: newUser[FIELD_MAP.email],
        role: newUser[FIELD_MAP.role],
      },
    });
  } catch (error) {
    console.error("Fehler beim Erstellen des Benutzers:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PUT /api/users/:id - Benutzer aktualisieren
export async function PUT(req) {
  try {
    // Prüfen, ob der Benutzer angemeldet und ein Admin ist
    const auth = await checkAdminAuth(req);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    // ID aus der URL extrahieren
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    if (!userId || userId === 'users') {
      console.error("Ungültige Benutzer-ID in PUT-Anfrage", { url: req.url, pathParts });
      return NextResponse.json({ error: "Ungültige Benutzer-ID" }, { status: 400 });
    }
    
    console.log("Bearbeite Benutzer mit ID:", userId);

    const body = await req.json();
    const { username, email, password, role } = body;

    // Validierung
    if (!username || !email || !role) {
      return NextResponse.json({ error: "Benutzername, E-Mail und Rolle sind erforderlich" }, { status: 400 });
    }

    // Prüfen, ob E-Mail bereits von einem anderen Benutzer verwendet wird
    const checkUrl = `${BASEROW_URL}?user_field_names=true&filter_e-mail__equal=${encodeURIComponent(email)}`;
    const checkResponse = await fetch(checkUrl, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      cache: "no-store",
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error(`Baserow API-Fehler: ${checkResponse.status} ${errorText}`);
      return NextResponse.json({ error: "Fehler bei der E-Mail-Überprüfung" }, { status: 500 });
    }

    const checkData = await checkResponse.json();
    if (checkData.count > 0) {
      // Prüfen, ob die E-Mail dem aktuellen Benutzer gehört
      const existingUser = checkData.results.find((user) => user.id.toString() === userId);
      if (!existingUser && checkData.count > 0) {
        return NextResponse.json({ error: "E-Mail wird bereits von einem anderen Benutzer verwendet" }, { status: 400 });
      }
    }

    // Update-Daten vorbereiten
    const updateData = {};
    
    // Sicherstellen, dass wir die richtigen Feldnamen verwenden
    if (FIELD_MAP.username) updateData[FIELD_MAP.username] = username;
    if (FIELD_MAP.email) updateData[FIELD_MAP.email] = email;
    
    // Rolle konvertieren: String ("admin", "user") zu Baserow-Wert (2853, 2854)
    if (FIELD_MAP.role && role) {
      console.log(`PUT - Rolle aus Frontend: ${role}, Typ: ${typeof role}`);
      
      try {
        const roleValue = ROLE_MAP[role];
        if (roleValue !== undefined) {
          updateData[FIELD_MAP.role] = roleValue;
          console.log(`PUT - Rolle konvertiert: ${role} -> ${roleValue}`);
        } else {
          console.warn(`PUT - Unbekannte Rolle: ${role}, verwende Standardwert`);
          // Fallback auf Benutzer-Rolle
          updateData[FIELD_MAP.role] = ROLE_MAP.user;
        }
      } catch (error) {
        console.error(`PUT - Fehler bei der Rolle-Konvertierung:`, error);
        // Fallback auf Benutzer-Rolle
        updateData[FIELD_MAP.role] = ROLE_MAP.user;
      }
    }
    
    console.log("Update-Daten für Baserow:", updateData);

    // Passwort nur aktualisieren, wenn eines angegeben wurde
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData[FIELD_MAP.password] = hashedPassword;
    }

    // Benutzer in Baserow aktualisieren
    const updateUrl = `${BASEROW_URL}${userId}/?user_field_names=true`;
    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      if (updateResponse.status === 404) {
        return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
      }
      const errorText = await updateResponse.text();
      console.error(`Baserow API-Fehler: ${updateResponse.status} ${errorText}`);
      return NextResponse.json({ error: "Fehler beim Aktualisieren des Benutzers" }, { status: 500 });
    }

    const updatedUser = await updateResponse.json();
    return NextResponse.json({
      message: "Benutzer erfolgreich aktualisiert",
      user: {
        id: updatedUser.id,
        username: updatedUser[FIELD_MAP.username],
        email: updatedUser[FIELD_MAP.email],
        role: updatedUser[FIELD_MAP.role],
      },
    });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Benutzers:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/users/:id - Benutzer löschen
export async function DELETE(req) {
  try {
    // Prüfen, ob der Benutzer angemeldet und ein Admin ist
    const auth = await checkAdminAuth(req);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    // ID aus der URL extrahieren
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    if (!userId || userId === 'users') {
      return NextResponse.json({ error: "Ungültige Benutzer-ID" }, { status: 400 });
    }
    
    // Prüfen, ob der Benutzer sich selbst löschen möchte
    if (auth.user.id === userId) {
      return NextResponse.json({ error: "Sie können Ihren eigenen Benutzer nicht löschen" }, { status: 400 });
    }

    // Benutzer in Baserow löschen
    const deleteUrl = `${BASEROW_URL}${userId}/`;
    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
    });

    if (!deleteResponse.ok) {
      if (deleteResponse.status === 404) {
        return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
      }
      const errorText = await deleteResponse.text();
      console.error(`Baserow API-Fehler: ${deleteResponse.status} ${errorText}`);
      return NextResponse.json({ error: "Fehler beim Löschen des Benutzers" }, { status: 500 });
    }

    return NextResponse.json({ message: "Benutzer erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Benutzers:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
