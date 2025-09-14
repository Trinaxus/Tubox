'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './GalleryCard.module.css';
import { isVideoGallery } from '@/app/utils/mediaHelpers';
import PasswordProtectedImage from './PasswordProtectedImage';

interface GalleryCardProps {
  galleryName: string;
  displayName: string;
  year: string;
  thumbnailUrl: string;
  metadata: any;
  onClick: () => void;
}

export default function GalleryCard({ 
  galleryName, 
  displayName, 
  year, 
  thumbnailUrl, 
  metadata, 
  onClick 
}: GalleryCardProps) {
  // State für das Laden des Bildes
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Prüfen, ob die Galerie passwortgeschützt ist direkt aus den Metadaten
  const isPasswordProtected = metadata?.passwordProtected === true || (metadata?.password && metadata.password.length > 0);
  
  // Prüfen, ob der Benutzer authentifiziert ist
  const hasAccess = !isPasswordProtected || (typeof window !== 'undefined' && sessionStorage.getItem(`gallery_token_${galleryName}`) !== null);
  
  // Entscheiden, ob das Bild unscharf sein soll
  const shouldBlur = isPasswordProtected && !hasAccess;
  
  // Beim Laden der Komponente console.log ausgeben
  useEffect(() => {
    console.log(`Gallery ${galleryName}:`);
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
      transition={{ duration: 0.3 }}
      className={styles.galleryCard}
      onClick={onClick}
      data-password-protected={shouldBlur ? "true" : "false"}
    >
      <div className={styles.imageContainer} style={{ position: 'relative' }}>
        <PasswordProtectedImage
          src={thumbnailUrl}
          alt={displayName}
          isProtected={isPasswordProtected}
          hasAccess={hasAccess}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.image}
          style={{ objectFit: 'cover' }}
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
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>
          {displayName}
          <span style={{ 
            backgroundColor: '#ff00ff', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            fontSize: '0.7em',
            marginLeft: '8px',
            verticalAlign: 'middle'
          }}>
            CARD-V1
          </span>
        </h3>
        <p className={styles.subtitle}>{year}</p>
      </div>
    </motion.div>
  );
}
