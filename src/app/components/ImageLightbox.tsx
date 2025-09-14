"use client";
import { useState, useEffect } from 'react';

interface ImageLightboxProps {
  images: string[];
  isOpen: boolean;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ImageLightbox({ 
  images, 
  isOpen, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrev 
}: ImageLightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Schließen mit Escape-Taste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);
  
  // Verhindere Scrollen, wenn die Lightbox geöffnet ist
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Setze Loading-Status zurück, wenn sich das Bild ändert
  useEffect(() => {
    setIsLoading(true);
  }, [currentIndex]);
  
  if (!isOpen) return null;
  
  const currentImage = images[currentIndex];
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Schließen-Button */}
      <button 
        className="absolute top-4 right-4 z-50 p-2 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Navigations-Buttons */}
      <button 
        className="absolute left-4 z-50 p-2 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button 
        className="absolute right-4 z-50 p-2 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      {/* Bild-Container */}
      <div 
        className="relative max-w-[90vw] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading-Indikator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Bild */}
        <img
          src={currentImage}
          alt={`Bild ${currentIndex + 1} von ${images.length}`}
          className="max-w-full max-h-[90vh] object-contain"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
        
        {/* Bild-Zähler */}
        <div className="mt-4 text-center bg-black/70 text-white px-4 py-2">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
