'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Wifi, WifiOff, Download, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextType {
  isOnline: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isOnline: true,
  canInstall: false,
  isInstalled: false,
  promptInstall: async () => {},
});

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showStatusToast, setShowStatusToast] = useState<boolean>(false);

  useEffect(() => {
    // 1. Initialiser le statut réseau
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setShowStatusToast(true);
        setTimeout(() => setShowStatusToast(false), 4000);
      };

      const handleOffline = () => {
        setIsOnline(false);
        setShowStatusToast(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 2. Enregistrer le Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[StudyFlow] Service Worker actif, scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('[StudyFlow] Échec Service Worker:', err);
          });
      }

      // 3. Écouter l'événement d'installation PWA
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      // Vérifier si déjà installé en mode standalone
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        canInstall: !!deferredPrompt && !isInstalled,
        isInstalled,
        promptInstall,
      }}
    >
      {/* Toast d'état réseau */}
      {showStatusToast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium transition-all backdrop-blur-md animate-fade-in ${
            isOnline
              ? 'bg-emerald-500/90 text-white shadow-emerald-500/20'
              : 'bg-amber-600/90 text-white shadow-amber-600/20'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Connexion rétablie — Données synchronisées</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Mode Hors-ligne — Données locales actives</span>
            </>
          )}
        </aside>
      )}

      {children}
    </PwaContext.Provider>
  );
}
