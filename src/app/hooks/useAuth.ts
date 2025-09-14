"use client";

import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null
  });

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // API-Aufruf zur Überprüfung des Authentifizierungsstatus
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const userData = await response.json();
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: userData
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null
          });
        }
      } catch (error) {
        console.error('Fehler beim Prüfen des Auth-Status:', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null
        });
      }
    };

    checkAuthStatus();
  }, []);

  return authState;
}