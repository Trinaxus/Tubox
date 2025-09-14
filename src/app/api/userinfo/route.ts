import { NextRequest, NextResponse } from "next/server";

// Baserow-Konfiguration
const BASEROW_API_URL = process.env.BASEROW_API_URL || "https://api.baserow.io/api";
const BASEROW_USER_TABLE_ID = process.env.BASEROW_USER_TABLE_ID || "669";
const BASEROW_TOKEN = process.env.BASEROW_TOKEN || "o6Xp7Ms6gKT3R0xcoaW6iFSKdPGT1mjf";

// Direkter Zugriff auf die Baserow-API
export async function GET(req: NextRequest) {
  try {
    // E-Mail aus Query-Parameter holen
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });
    }
    
    // Direkter Zugriff auf Baserow
    const url = `${BASEROW_API_URL}/database/rows/table/${BASEROW_USER_TABLE_ID}/?user_field_names=true`;
    const response = await fetch(url, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      cache: "no-store"
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: "Fehler beim Zugriff auf Baserow" }, { status: 500 });
    }
    
    const data = await response.json();
    
    // Benutzer mit der angegebenen E-Mail suchen
    const user = data.results?.find((u: any) => 
      u["e-mail"]?.toLowerCase() === email.toLowerCase()
    );
    
    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    
    // Erfolgreiche Antwort mit Benutzerdaten
    return NextResponse.json({
      username: user.username,
      email: user["e-mail"],
      role: user.role
    });
  } catch (error) {
    console.error("API-Fehler:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
