'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './PasswordProtectedImage.module.css';

interface PasswordProtectedImageProps {
  src: string;
  alt: string;
  isProtected: boolean;
  hasAccess: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
}

export default function PasswordProtectedImage({
  src,
  alt,
  isProtected,
  hasAccess,
  sizes = '100vw',
  className = '',
  style = {},
  onError,
  onLoad
}: PasswordProtectedImageProps) {
  // Bestimme, ob das Bild unscharf sein soll
  const shouldBlur = isProtected && !hasAccess;

  return (
    <div className={styles.imageContainer}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`${styles.image} ${className} ${shouldBlur ? styles.blurredImage : ''}`}
        style={style}
        onError={onError}
        onLoad={onLoad}
      />
      
      {shouldBlur && (
        <div className={styles.lockOverlay}>
          <div className={styles.lockBadge}>
            <img 
              src="/tonband_sessions.png" 
              alt="TONBAND Sessions Logo" 
              width={24} 
              height={24} 
              className={styles.lockIcon} 
            />
            Passwortgeschützt
          </div>
        </div>
      )}
    </div>
  );
}
