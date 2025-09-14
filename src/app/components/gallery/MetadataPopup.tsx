import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MetadataPopup.module.css';

interface MetadataPopupProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: any;
  isLoading: boolean;
}

export default function MetadataPopup({ isOpen, onClose, metadata, isLoading }: MetadataPopupProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="metadata-overlay"
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.popup}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'rgba(26, 26, 26, 0.9)', // Dunkler Hintergrund mit 10% Transparenz
            color: '#ffffff', // Hellere Schriftfarbe für bessere Lesbarkeit
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)', // Für Safari-Unterstützung
          }}
        >
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Popup schließen"
          >
            ✕
          </button>
          
          <div className={styles.content}>
            <h2 className={styles.title}>Bild Metadaten</h2>
            
            {isLoading ? (
              <div className={styles.loading}>Lade Metadaten...</div>
            ) : metadata?.error ? (
              <div className={styles.error}>
                <p>Metadaten konnten nicht geladen werden.</p>
                {metadata.fallback && (
                  <p>Dateiname: {metadata.fallback.fileName}</p>
                )}
              </div>
            ) : (
              <div className={styles.metadataGrid}>
                <div className={styles.section}>
                  <h3>Datei-Info</h3>
                  <div className={styles.row}>
                    <span className={styles.label}>Dateiname:</span>
                    <span className={styles.value}>{metadata?.fileInfo?.fileName ? metadata.fileInfo.fileName : 'Unbekannt'}</span>
                  </div>
                  {metadata?.fileInfo?.fileSize && (
                    <div className={styles.row}>
                      <span className={styles.label}>Dateigröße:</span>
                      <span className={styles.value}>{metadata.fileInfo.fileSize}</span>
                    </div>
                  )}
                  <div className={styles.row}>
                    <span className={styles.label}>Abmessungen:</span>
                    <span className={styles.value}>
                      {metadata?.fileInfo?.dimensions ? 
                        `${metadata.fileInfo.dimensions.width} × ${metadata.fileInfo.dimensions.height} Pixel`
                        : metadata?.cameraInfo || metadata?.lensInfo || metadata?.captureDetails
                          ? 'Nicht in EXIF-Daten verfügbar' 
                          : 'Unbekannt'}
                    </span>
                  </div>
                  {metadata?.fileInfo?.dimensions && (
                    <div className={styles.row}>
                      <span className={styles.label}>Seitenverhältnis:</span>
                      <span className={styles.value}>
                        {(() => {
                          if (!metadata?.fileInfo?.dimensions) return '';
                          const { width, height } = metadata.fileInfo.dimensions;
                          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                          const divisor = gcd(width, height);
                          return `${width/divisor}:${height/divisor}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                {metadata?.cameraInfo && Object.values(metadata?.cameraInfo || {}).some(v => v) && (
                  <div className={styles.section}>
                    <h3>Kamera-Info</h3>
                    {metadata?.cameraInfo?.make && (
                      <div className={styles.row}>
                        <span className={styles.label}>Hersteller:</span>
                        <span className={styles.value}>{metadata?.cameraInfo?.make}</span>
                      </div>
                    )}
                    {metadata?.cameraInfo?.model && (
                      <div className={styles.row}>
                        <span className={styles.label}>Modell:</span>
                        <span className={styles.value}>{metadata?.cameraInfo?.model}</span>
                      </div>
                    )}
                    {metadata?.cameraInfo?.software && (
                      <div className={styles.row}>
                        <span className={styles.label}>Software:</span>
                        <span className={styles.value}>{metadata?.cameraInfo?.software}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {metadata?.lensInfo && Object.values(metadata?.lensInfo || {}).some(v => v) && (
                  <div className={styles.section}>
                    <h3>Objektiv-Info</h3>
                    {metadata?.lensInfo?.lensModel && (
                      <div className={styles.row}>
                        <span className={styles.label}>Objektiv:</span>
                        <span className={styles.value}>{metadata?.lensInfo?.lensModel}</span>
                      </div>
                    )}
                    {metadata?.lensInfo?.lensMake && (
                      <div className={styles.row}>
                        <span className={styles.label}>Hersteller:</span>
                        <span className={styles.value}>{metadata?.lensInfo?.lensMake}</span>
                      </div>
                    )}
                    {metadata?.lensInfo?.focalLength && (
                      <div className={styles.row}>
                        <span className={styles.label}>Brennweite:</span>
                        <span className={styles.value}>{metadata?.lensInfo?.focalLength}</span>
                      </div>
                    )}
                    {metadata?.lensInfo?.focalLengthIn35mm && (
                      <div className={styles.row}>
                        <span className={styles.label}>KB-Brennweite:</span>
                        <span className={styles.value}>{metadata?.lensInfo?.focalLengthIn35mm}</span>
                      </div>
                    )}
                    {metadata?.lensInfo?.maxApertureValue && (
                      <div className={styles.row}>
                        <span className={styles.label}>Max. Blende:</span>
                        <span className={styles.value}>{metadata?.lensInfo?.maxApertureValue}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {metadata?.captureDetails && Object.values(metadata?.captureDetails || {}).some(v => v) && (
                  <div className={styles.section}>
                    <h3>Aufnahmedetails</h3>
                    {metadata?.captureDetails?.dateTaken && (
                      <div className={styles.row}>
                        <span className={styles.label}>Aufnahmedatum:</span>
                        <span className={styles.value}>{metadata?.captureDetails?.dateTaken}</span>
                      </div>
                    )}
                    {metadata?.captureDetails?.exposure && (
                      <div className={styles.row}>
                        <span className={styles.label}>Belichtungszeit:</span>
                        <span className={styles.value}>{metadata?.captureDetails?.exposure}</span>
                      </div>
                    )}
                    {metadata?.captureDetails?.aperture && (
                      <div className={styles.row}>
                        <span className={styles.label}>Blende:</span>
                        <span className={styles.value}>{metadata?.captureDetails?.aperture}</span>
                      </div>
                    )}
                    {metadata?.captureDetails?.iso && (
                      <div className={styles.row}>
                        <span className={styles.label}>ISO:</span>
                        <span className={styles.value}>{metadata?.captureDetails?.iso}</span>
                      </div>
                    )}
                    {metadata?.captureDetails?.focalLength && (
                      <div className={styles.row}>
                        <span className={styles.label}>Brennweite:</span>
                        <span className={styles.value}>{metadata?.captureDetails?.focalLength}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {metadata?.gpsInfo && Object.values(metadata?.gpsInfo || {}).some(v => v) && (
                  <div className={styles.section}>
                    <h3>GPS-Informationen</h3>
                    {metadata?.gpsInfo?.latitude && (
                      <div className={styles.row}>
                        <span className={styles.label}>Breitengrad:</span>
                        <span className={styles.value}>{metadata?.gpsInfo?.latitude}</span>
                      </div>
                    )}
                    {metadata?.gpsInfo?.longitude && (
                      <div className={styles.row}>
                        <span className={styles.label}>Längengrad:</span>
                        <span className={styles.value}>{metadata?.gpsInfo?.longitude}</span>
                      </div>
                    )}
                    {metadata?.gpsInfo?.altitude && (
                      <div className={styles.row}>
                        <span className={styles.label}>Höhe:</span>
                        <span className={styles.value}>{metadata?.gpsInfo?.altitude}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
