"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useEffect } from "react";

export default function LoginPage() {
  // Gemeinsame Felder
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      // Nur Login-Endpunkt verwenden
      const endpoint = "/api/login";
      const payload = { email, password };
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      setLoading(false);
      
      if (res.ok) {
        // Erfolgreicher Login - immer zur Galerie-Seite weiterleiten
        const data = await res.json();
        router.push("/gallery");
      } else {
        // API-Fehler mit Statuscode
        try {
          const data = await res.json();
          setError(data.error || `Fehler: ${res.status}`);
        } catch (jsonError) {
          // Wenn die Antwort kein gültiges JSON ist
          setError(`Fehler ${res.status}: ${res.statusText}`);
        }
      }
    } catch (fetchError) {
      // Netzwerkfehler oder andere Exceptions
      setLoading(false);
      setError("Verbindungsfehler: Bitte prüfe deine Internetverbindung");
      console.error(`Login-Fehler:`, fetchError);
    }
  }

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <main className="flex flex-col items-center justify-start pt-8 min-h-screen h-screen overflow-hidden transition-colors">
      <div className="w-full max-w-md mx-4">
        <div className="stylish-card absolute inset-0 z-0 pointer-events-none" aria-hidden="true"></div>
        <div 
          className="z-10 bg-transparent backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-[#00e1ff40] shadow-none transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,225,255,0.2)] hover:border-[#00e1ff80]"
        >
          <div className="flex mb-6 border-b-2 border-[#2d2d2d] border-opacity-40">
            <div className={`flex-1 py-2 font-medium text-center text-white border-b-2 border-white`}>
              Login
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-center text-white mb-4">Login</h1>
          
          {/* Gemeinsame Felder */}
          <label className="flex flex-col gap-1" style={{color:'#fff'}}>
            E-Mail
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #2d2d2d',
                  backgroundColor: '#18181b',
                  
                  fontSize: '16px',
                  fontWeight: '500',
                  width: '100%',
                  boxShadow: 'none',
                  outline: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
              required
              autoFocus
              placeholder="deine@email.de"
            />
          </label>
          <label className="flex flex-col gap-1" style={{color:'#fff'}}>
            Passwort
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #2d2d2d',
                  backgroundColor: '#18181b',
                  
                  fontSize: '16px',
                  fontWeight: '500',
                  width: '100%',
                  boxShadow: 'none',
                  outline: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
              required
              placeholder="••••••••"
            />
          </label>
          
          {/* Fehlermeldungen und Erfolgsmeldungen */}
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          
          {/* Submit-Button */}
          <button
            type="submit"
            className="mt-4 button w-full font-semibold disabled:opacity-60 transition-colors shadow-md"
            disabled={loading}
          >
            {loading ? "Login ..." : "Login"}
          </button>
          
          {/* Link zur Galerie */}
          <div className="text-center mt-4">
            <Link href="/gallery" className="text-sm text-[#b4b4b4] hover:text-white transition-colors">
              Zurück zur Galerie
            </Link>
          </div>
        </form>
        </div>
      </div>
    </main>
  );
}
