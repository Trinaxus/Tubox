'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from '../../gallery/gallery.module.css';
import { isVideoUrl } from '@/app/utils/mediaHelpers';
import PasswordProtectedImage from './PasswordProtectedImage';

interface GalleryMetadata {
  password?: string;
  // Fügen Sie hier weitere Metadatenfelder hinzu, die Sie verwenden
  [key: string]: any;
}

interface GalleryDetailProps {
  galleryName: string;
  images: string[];
  metadata: GalleryMetadata;
  onBackAction: () => void;
}

export default function GalleryDetail({ 
  galleryName, 
  images, 
  metadata, 
  onBackAction: onBack 
}: GalleryDetailProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Prüfen, ob die Galerie passwortgeschützt ist
  const hasPassword = Boolean(metadata?.password && metadata.password.length > 0);
  const isAuthenticated = typeof window !== 'undefined' && sessionStorage.getItem(`gallery_token_${galleryName}`) !== null;
  const needsBlur = hasPassword && !isAuthenticated;

  const displayName = galleryName.split("/")[1] || galleryName;
  const year = galleryName.split("/")[0] || "";

  return (
    <div className={styles.galleryDetail}>
      <div className={styles.galleryHeader}>
        <button 
          onClick={onBack} 
          className={styles.backButton}
        >
          ← Zurück
        </button>
        <div>
          <h1 className={styles.galleryTitle}>
            {displayName}
            {needsBlur && (
              <span style={{
                marginLeft: '10px',
                fontSize: '0.6em',
                backgroundColor: 'rgba(255, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '8px',
                verticalAlign: 'middle',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span role="img" aria-label="Passwortgeschützt">🔒</span>
                Passwortgeschützt
              </span>
            )}
          </h1>
          {metadata?.jahr && (
            <h2 className={styles.gallerySubtitle}>{metadata.jahr}</h2>
          )}
        </div>
      </div>

      <div className={styles.detailGrid}>
        {images.map((imageUrl, index) => {
          const isVideo = isVideoUrl(imageUrl);
          
          return (
            <div 
              key={imageUrl} 
              className={styles.imageCard}
              onClick={() => setSelectedImage(imageUrl)}
            >
              {isVideo ? (
                <div className={styles.videoContainer}>
                  <video 
                    src={imageUrl} 
                    controls 
                    className={styles.video}
                  />
                </div>
              ) : (
                <div className={styles.imageWrapper}>
                  <PasswordProtectedImage
                    src={imageUrl}
                    alt={`Bild ${index + 1}`}
                    isProtected={hasPassword}
                    hasAccess={isAuthenticated}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className={styles.detailImage}
                    style={{ objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%232a1208'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23ff6b00' text-anchor='middle'%3EBild%3C/text%3E%3C/svg%3E`;
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox für Vollbildansicht */}
      {selectedImage && !isVideoUrl(selectedImage) && (
        <div 
          className={styles.lightbox}
          onClick={() => setSelectedImage(null)}
        >
          <div className={styles.lightboxContent}>
            <Image
              src={selectedImage}
              alt="Vollbildansicht"
              fill
              sizes="100vw"
              style={{ objectFit: 'contain' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className={styles.closeLightbox}
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
