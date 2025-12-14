import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { SnackbarMessage, SnackbarType } from '@/components/ui/Snackbar';
import Snackbar from '@/components/ui/Snackbar';

interface SnackbarContextType {
  showSnackbar: (message: string, type: SnackbarType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [currentMessage, setCurrentMessage] = useState<SnackbarMessage | null>(null);
  const [queue, setQueue] = useState<SnackbarMessage[]>([]);

  const processQueue = useCallback(() => {
    if (queue.length > 0 && !currentMessage) {
      const nextMessage = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentMessage(nextMessage);
    }
  }, [queue, currentMessage]);

  const showSnackbar = useCallback(
    (message: string, type: SnackbarType, duration: number = 4000) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newMessage: SnackbarMessage = {
        id,
        message,
        type,
        duration,
      };

      if (currentMessage) {
        // Add to queue if there's already a message showing
        setQueue((prev) => [...prev, newMessage]);
      } else {
        // Show immediately if no message is currently displayed
        setCurrentMessage(newMessage);
      }
    },
    [currentMessage]
  );

  const handleDismiss = useCallback(
    (id: string) => {
      if (currentMessage?.id === id) {
        setCurrentMessage(null);
        // Process next message in queue after a short delay
        setTimeout(() => {
          processQueue();
        }, 300);
      }
    },
    [currentMessage, processQueue]
  );

  // Process queue when currentMessage becomes null
  useEffect(() => {
    if (!currentMessage && queue.length > 0) {
      processQueue();
    }
  }, [currentMessage, queue, processQueue]);

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showSnackbar(message, 'success', duration);
    },
    [showSnackbar]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showSnackbar(message, 'error', duration);
    },
    [showSnackbar]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showSnackbar(message, 'warning', duration);
    },
    [showSnackbar]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showSnackbar(message, 'info', duration);
    },
    [showSnackbar]
  );

  return (
    <SnackbarContext.Provider
      value={{
        showSnackbar,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <Snackbar message={currentMessage} onDismiss={handleDismiss} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}

