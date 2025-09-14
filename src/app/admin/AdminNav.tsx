"use client";

// Globale Admin-Navigation für alle Admin-Seiten
import React, { useState, useEffect } from "react";
import styles from "./admin.module.css";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const currentPath = pathname || "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Effekt zur Erkennung von mobilen Geräten
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Event listener für Größenänderungen
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Schließen des Menüs beim Klicken außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMenuOpen && !target.closest(`.${styles.adminNav}`)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);
  
  // Schließen des Menüs beim Navigieren
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);
  
  const navLinks = [
    {
      href: "/admin",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
      label: "Galerien",
      isActive: currentPath === "/admin"
    },
    {
      href: "/admin/blog",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
        </svg>
      ),
      label: "Blog-Management",
      isActive: currentPath.startsWith("/admin/blog")
    },
    // Benutzerverwaltung entfernt (Single-Admin-Modus)
    {
      href: "/admin/folders",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      label: "Ordnerverwaltung",
      isActive: currentPath.startsWith("/admin/folders")
    }
  ];
  
  return (
    <div className={styles.adminNavContainer}>
      {isMobile ? (
  <>
    <button
      className={styles.hamburgerButton}
      onClick={(e) => {
        e.stopPropagation();
        setIsMenuOpen((open) => !open);
      }}
      aria-label="Menü öffnen"
      aria-expanded={isMenuOpen}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
    <nav
      className={`${styles.adminNav} ${styles.adminNavMobile} ${isMenuOpen ? styles.adminNavOpen : ''}`}
      aria-label="Admin Navigation Mobile"
      style={{ background: "rgba(30,40,50,0.66)", boxShadow: "0 8px 32px rgba(0,0,0,0.13)" }}
    >
      {navLinks.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className={`${styles.navLink} ${link.isActive ? styles.active : ""}`}
          onClick={() => setIsMenuOpen(false)}
        >
          {link.icon}
          {link.label}
        </a>
      ))}
    </nav>
  </>
) : (
  <nav className={styles.adminNav} aria-label="Admin Navigation">
    {navLinks.map((link, index) => (
      <a
        key={index}
        href={link.href}
        className={`${styles.navLink} ${link.isActive ? styles.active : ""}`}
      >
        {link.icon}
        {link.label}
      </a>
    ))}
  </nav>
)}
    </div>
  );
}
