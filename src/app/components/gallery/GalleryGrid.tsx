'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../gallery/gallery.module.css';
import GalleryCard from './GalleryCard';
import { getVideoThumbnail } from '@/app/utils/mediaHelpers';

interface GalleryGridProps {
  galleries: Record<string, string[]>;
  metadata: Record<string, any>;
  selectedCategory: string;
  onGalleryClick: (galleryName: string) => void;
}

// Hilfsfunktionen für Video-Erkennung
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Normalisiere die URL (entferne Query-Parameter und Anker)
  let normalizedUrl = url;
  if (normalizedUrl.includes('?')) {
    normalizedUrl = normalizedUrl.split('?')[0];
  }
  if (normalizedUrl.includes('#')) {
    normalizedUrl = normalizedUrl.split('#')[0];
  }
  
  const lowercaseUrl = normalizedUrl.toLowerCase();
  
  // Prüfe auf bekannte Video-Dateiendungen
  const videoExtensions = [
    '.mp4', '.mov', '.webm', '.avi', '.mkv', '.wmv', 
    '.m4v', '.mpg', '.mpeg', '.3gp', '.flv', '.f4v', '.swf'
  ];
  
  // Prüfe, ob die URL mit einer der Video-Dateiendungen endet
  return videoExtensions.some(ext => lowercaseUrl.endsWith(ext));
};

const isVideoGallery = (galleryName: string): boolean => {
  // Prüfe den Galerienamen - einfachste und zuverlässigste Methode
  return galleryName.includes('VIDEOS') || galleryName.includes('Videos') || galleryName.includes('videos');
};

export default function GalleryGrid({ 
  galleries, 
  metadata, 
  selectedCategory,
  onGalleryClick 
}: GalleryGridProps) {
  return (
    <>
      <div className="grid-marker">
        GRID-MARKER-V2
      </div>
      <motion.div 
        className={styles.galleryGrid}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatePresence>
          {Object.entries(galleries)
            .filter(([galleryName]) => {
              if (selectedCategory === "Alle") return true;
              const meta = metadata[galleryName];
              return meta && meta.kategorie === selectedCategory;
            })
            .sort((a, b) => {
              // Sortiere nach Jahr (absteigend)
              const yearA = parseInt(metadata[a[0]]?.jahr || "0", 10);
              const yearB = parseInt(metadata[b[0]]?.jahr || "0", 10);
              return yearB - yearA;
            })
            .map(([galleryName, images], index) => {
              const displayName = galleryName.split("/")[1] || galleryName;
              const year = galleryName.split("/")[0] || "";
              
              // Verwende ein spezielles Thumbnail für Video-Galerien
              let thumbnailUrl;
              if (isVideoGallery(galleryName)) {
                // Suche nach einem Video in der Galerie
                const videoFile = images.find(url => isVideoUrl(url));
                if (videoFile) {
                  thumbnailUrl = getVideoThumbnail(videoFile, images);
                } else {
                  // Fallback, wenn kein Video gefunden wurde
                  thumbnailUrl = images[0] || "";
                }
              } else {
                // Für normale Galerien verwende das erste Bild
                thumbnailUrl = images[0] || "";
              }

              // Prüfen, ob die Galerie passwortgeschützt ist
              const galleryMetadata = metadata[galleryName] || {};
              const hasPassword = galleryMetadata.password && galleryMetadata.password.length > 0;
              const isAuthenticated = typeof window !== 'undefined' && 
                sessionStorage.getItem(`gallery_token_${galleryName}`) !== null;
              const shouldBlur = hasPassword && !isAuthenticated;
              
              // Debug-Ausgabe in der Konsole
              console.log(`Gallery ${galleryName}:`);
              console.log(`- Password protected: ${hasPassword}`);
              console.log(`- Has access: ${isAuthenticated}`);
              console.log(`- Should blur: ${shouldBlur}`);
              
              // Direkter Ansatz mit eigenem Container und Image
              return (
                <div 
                  key={galleryName}
                  className="gallery-card-wrapper"
                  data-password-protected={shouldBlur ? "true" : "false"}
                  onClick={() => onGalleryClick(galleryName)}
                  style={{
                    transition: 'all 0.3s ease-in-out',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: '1px solid rgba(0, 225, 255, 0.6)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                  }}
                  onMouseOver={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = 'translateY(-8px)';
                    target.style.borderRadius = '12px';
                    target.style.boxShadow = '0 12px 24px rgba(0, 225, 255, 0.3)';
                    target.style.borderColor = 'rgba(0, 225, 255, 0.5)';
                  }}
                  onMouseOut={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = 'translateY(0)';
                    target.style.borderRadius = '12px';
                    target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                    target.style.borderColor = 'rgba(0, 225, 255, 0.6)';
                  }}
                >
                  {/* Bild-Container */}
                  <div className="gallery-image-container">
                    <img 
                      src={thumbnailUrl} 
                      alt={displayName}
                      className="gallery-image"
                    />
                    
                    {/* Kategorie-Tag */}
                    {galleryMetadata.kategorie && (
                      <div className="gallery-category-tag">
                        {galleryMetadata.kategorie}
                      </div>
                    )}
                  </div>
                  
                  {/* Info-Bereich */}
                  <div className="gallery-info">
                    <h3 className="gallery-title">
                      {displayName}
                      {shouldBlur && (
                        <span className="gallery-password-badge">
                          PASSWORT
                        </span>
                      )}
                    </h3>
                    <p className="gallery-year">{year}</p>
                  </div>
                  
                  {/* Debug-Marker */}
                  <div className={`gallery-debug-marker ${shouldBlur ? 'gallery-debug-marker-password' : 'gallery-debug-marker-free'}`}>
                    {shouldBlur ? 'PASSWORT' : 'FREI'}
                  </div>
                </div>
              );
            })}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
