import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface InstallPromptContextType {
  deferredPrompt: any;
  isInstallable: boolean;
  promptInstall: () => Promise<boolean>;
  clearPrompt: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextType>({
  deferredPrompt: null,
  isInstallable: false,
  promptInstall: async () => false,
  clearPrompt: () => {},
});

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const clearPrompt = useCallback(() => setDeferredPrompt(null), []);

  return (
    <InstallPromptContext.Provider value={{
      deferredPrompt,
      isInstallable: !!deferredPrompt,
      promptInstall,
      clearPrompt,
    }}>
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  return useContext(InstallPromptContext);
}
