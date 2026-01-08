import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { QuickCaptureModal } from './QuickCaptureModal';

interface QuickCaptureOptions {
  stayOpenAfterSave?: boolean;
}

interface QuickCaptureContextType {
  isOpen: boolean;
  openQuickCapture: (options?: QuickCaptureOptions) => void;
  closeQuickCapture: () => void;
  stayOpenAfterSave: boolean;
  setStayOpenAfterSave: (value: boolean) => void;
}

const QuickCaptureContext = createContext<QuickCaptureContextType | undefined>(undefined);

export function useQuickCapture() {
  const context = useContext(QuickCaptureContext);
  if (!context) {
    throw new Error('useQuickCapture must be used within a QuickCaptureProvider');
  }
  return context;
}

interface QuickCaptureProviderProps {
  children: ReactNode;
}

export function QuickCaptureProvider({ children }: QuickCaptureProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stayOpenAfterSave, setStayOpenAfterSave] = useState(false);

  const openQuickCapture = useCallback((options?: QuickCaptureOptions) => {
    if (options?.stayOpenAfterSave !== undefined) {
      setStayOpenAfterSave(options.stayOpenAfterSave);
    }
    setIsOpen(true);
  }, []);

  const closeQuickCapture = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || 
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Only prevent default and open if not already open
        // If typing in our modal, let it through
        if (!isTyping || isOpen) {
          e.preventDefault();
          if (!isOpen) {
            openQuickCapture();
          }
        } else {
          // If typing elsewhere, still open quick capture
          e.preventDefault();
          openQuickCapture();
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        closeQuickCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openQuickCapture, closeQuickCapture]);

  return (
    <QuickCaptureContext.Provider value={{ 
      isOpen, 
      openQuickCapture, 
      closeQuickCapture,
      stayOpenAfterSave,
      setStayOpenAfterSave
    }}>
      {children}
      <QuickCaptureModal 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        onReopenCapture={openQuickCapture}
        stayOpenAfterSave={stayOpenAfterSave}
      />
    </QuickCaptureContext.Provider>
  );
}
