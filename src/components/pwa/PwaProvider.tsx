'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  toggleOfflineMode: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isOnline: true,
  isSimulatedOffline: false,
  canInstall: false,
  isInstalled: false,
  promptInstall: async () => {},
  toggleOfflineMode: () => {},
});

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showStatusToast, setShowStatusToast] = useState<boolean>(false);

  const isOnlineRef = useRef<boolean>(true);
  const simulatedOfflineRef = useRef<boolean>(false);

  const applyOnlineState = (nextOnline: boolean) => {
    if (isOnlineRef.current !== nextOnline) {
      isOnlineRef.current = nextOnline;
      setIsOnline(nextOnline);
      setShowStatusToast(true);
      if (nextOnline) {
        setTimeout(() => setShowStatusToast(false), 4000);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Sonde de connectivité Internet réelle (détecte la coupure Wi-Fi même sur localhost / Windows avec adaptateurs virtuels WSL/Docker)
    const checkRealConnectivity = async () => {
      if (simulatedOfflineRef.current) {
        applyOnlineState(false);
        return;
      }

      if (!navigator.onLine) {
        applyOnlineState(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      try {
        await fetch(`https://www.gstatic.com/generate_204?_=${Date.now()}`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!simulatedOfflineRef.current) {
          applyOnlineState(true);
        }
      } catch {
        clearTimeout(timeoutId);
        applyOnlineState(false);
      }
    };

    checkRealConnectivity();
    const intervalId = setInterval(checkRealConnectivity, 3500);

    const handleBrowserOnline = () => {
      checkRealConnectivity();
    };

    const handleBrowserOffline = () => {
      applyOnlineState(false);
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('focus', handleBrowserOnline);

    const navConnection = (navigator as any).connection;
    if (navConnection && typeof navConnection.addEventListener === 'function') {
      navConnection.addEventListener('change', checkRealConnectivity);
    }

    // 2. Nettoyer les anciens caches d'API et enregistrer le Service Worker
    if ('caches' in window) {
      caches.delete('studyflow-v1.1').catch(() => {});
      caches.delete('studyflow-v1.2').catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update().catch(() => {});
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

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('focus', handleBrowserOnline);
      if (navConnection && typeof navConnection.removeEventListener === 'function') {
        navConnection.removeEventListener('change', checkRealConnectivity);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const toggleOfflineMode = () => {
    const nextSim = !simulatedOfflineRef.current;
    simulatedOfflineRef.current = nextSim;
    setIsSimulatedOffline(nextSim);
    if (nextSim) {
      applyOnlineState(false);
    } else {
      applyOnlineState(navigator.onLine);
    }
  };

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
        isSimulatedOffline,
        canInstall: !!deferredPrompt && !isInstalled,
        isInstalled,
        promptInstall,
        toggleOfflineMode,
      }}
    >
      {/* Toast d'état réseau */}
      {showStatusToast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-xs sm:text-sm font-semibold transition-all backdrop-blur-md animate-fade-in ${
            isOnline
              ? 'bg-emerald-500/95 text-white shadow-emerald-500/20'
              : 'bg-amber-600/95 text-white shadow-amber-600/20'
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
