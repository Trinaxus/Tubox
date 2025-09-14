'use client';

import React from 'react';

interface ModernBackgroundProps {
  primaryColor?: string;
  accentColor?: string;
  pattern?: 'gradient' | 'mesh' | 'dots' | 'none';
}

export default function ModernBackground({
  primaryColor = '#1a0500',
  accentColor = '#ff6b00',
  pattern = 'gradient'
}: ModernBackgroundProps) {
  // Vereinfachte Version ohne komplexe Logik
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(135deg, #18181b 0%, #232326 40%, #232429 80%, #1a1a1a 100%)', // subtile Grauabstufungen
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Subtile Akzent-Elemente */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          right: '5%',
          width: '30%',
          height: '40%',
          background: 'radial-gradient(circle at center, rgba(0,225,255,0.15) 20%, transparent 25%)', // secondary.500
          borderRadius: '50%',
          filter: 'blur(2000px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '40%',
          height: '30%',
          background: 'radial-gradient(circle at center, rgba(225, 0, 145, 0.15) 60%, transparent 25%)', // secondary.500
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />
    </div>
  );
}
