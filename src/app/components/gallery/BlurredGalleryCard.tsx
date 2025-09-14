'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './GalleryCard.module.css';
import { isVideoGallery } from '@/app/utils/mediaHelpers';

interface BlurredGalleryCardProps {
  galleryName: string;
  displayName: string;
  year: string;
  thumbnailUrl: string;
  metadata: any;
  onClick: () => void;
}

export default function BlurredGalleryCard({ 
  galleryName, 
  displayName, 
  year, 
  thumbnailUrl, 
  metadata, 
  onClick 
}: BlurredGalleryCardProps) {
  // State für das Laden des Bildes
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Prüfen, ob die Galerie passwortgeschützt ist
  const isPasswordProtected = metadata?.passwordProtected === true || (metadata?.password && metadata.password.length > 0);
  
  // Prüfen, ob der Benutzer authentifiziert ist - auch über unlockedGalleries
  const hasAccess = !isPasswordProtected || 
    (typeof window !== 'undefined' && (
      sessionStorage.getItem(`gallery_token_${galleryName}`) !== null ||
      sessionStorage.getItem('unlockedGalleries')?.includes(galleryName)
    ));
  
  // Entscheiden, ob das Bild unscharf sein soll
  const shouldBlur = isPasswordProtected && !hasAccess;
  
  // Debug-Ausgabe in der Konsole
  useEffect(() => {
    console.log(`BlurredGalleryCard - Gallery ${galleryName}:`);
    console.log(`- Password protected: ${isPasswordProtected}`);
    console.log(`- Has access: ${hasAccess}`);
    console.log(`- Should blur: ${shouldBlur}`);
    console.log(`- Metadata:`, metadata);
  }, [galleryName, isPasswordProtected, hasAccess, shouldBlur, metadata]);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={styles.galleryCard}
      onClick={onClick}
      style={{ position: 'relative' }}
    >
      {/* Kein Debug-Marker mehr */}
      
      <div className={styles.imageContainer} style={{ position: 'relative' }}>
        <Image
          src={thumbnailUrl}
          alt={displayName}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.image}
          style={{ 
            objectFit: 'cover',
            transition: 'all 0.3s ease-in-out',
            filter: shouldBlur ? 'blur(8px)' : 'none', /* Grayscale entfernt */
            opacity: shouldBlur ? 0.7 : 1
          }}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            // Fallback für fehlerhafte Bilder
            const target = e.target as HTMLImageElement;
            target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%23232429'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23b4b4b4' text-anchor='middle'%3E${isVideoGallery(galleryName) ? 'Video' : 'Bild'}%3C/text%3E%3C/svg%3E`;
            setImageLoaded(true);
          }}
        />
        
        {metadata?.kategorie && (
          <div className={styles.categoryTag}>
            {metadata.kategorie}
          </div>
        )}
        
        {/* Passwort-Overlay - ABSOLUT SICHTBAR */}
        {shouldBlur && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent', /* Keine Abdunklung mehr */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{
              backgroundColor: 'var(--color-primary-500, #ff6b00)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}>
              <span style={{ fontSize: '18px' }}>🔒</span>
              Passwort
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.info}>
        <h3 className={styles.title}>
          {displayName}
          {shouldBlur && (
            <span style={{ 
              backgroundColor: '#ff0000', 
              color: 'white', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              fontSize: '0.7em',
              marginLeft: '8px',
              verticalAlign: 'middle'
            }}>
              PASSWORT
            </span>
          )}
        </h3>
        <p className={styles.subtitle}>{year}</p>
      </div>
    </motion.div>
  );
}
