"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../gallery/gallery.module.css";

export default function GalleryNav() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Prüfe, ob der Benutzer ein Admin ist
    const checkAdminStatus = async () => {
      try {
        // Prüfe zuerst, ob ein Session-Cookie vorhanden ist
        const sessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('tubox_session='));
        
        if (!sessionCookie) {
          setIsLoading(false);
          return;
        }
        
        // Versuche, Benutzerinformationen aus dem API-Endpunkt zu laden
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache"
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log("GalleryNav: Benutzer-Daten erhalten:", data);
          
          // Setze isAdmin auf true, wenn der Benutzer ein Admin ist
          const isUserAdmin = data.isLoggedIn && data.role === 'admin';
          console.log("GalleryNav: Ist Admin?", isUserAdmin, "Rolle:", data.role);
          setIsAdmin(isUserAdmin);
        }
      } catch (error) {
        console.error("GalleryNav: Fehler beim Prüfen des Admin-Status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (isLoading) {
    return null; // Während des Ladens nichts anzeigen
  }

  return (
    <div className={styles.galleryNav}>
      {/* Admin-Link - nur anzeigen, wenn der Benutzer ein Admin ist */}
      {isAdmin && (
        <Link href="/admin" className={styles.adminLink}>
          <span>ADMIN</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5C13 4.44772 12.5523 4 12 4Z" fill="#00e1ff"/>
          </svg>
        </Link>
      )}
    </div>
  );
}
