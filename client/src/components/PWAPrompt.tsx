import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      console.log('PWA: beforeinstallprompt event fired'); // Debug log

      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches;
    console.log('PWA: Is app installed?', isAppInstalled); // Debug log

    if (isAppInstalled) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('PWA: No deferred prompt available'); // Debug log
      return;
    }

    console.log('PWA: Triggering install prompt'); // Debug log
    // Show the install prompt
    deferredPrompt.prompt();

    try {
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: User ${outcome} the installation prompt`); // Debug log

      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('PWA: Error during installation:', error);
    }

    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border rounded-lg shadow-lg p-4 flex items-center justify-between z-50">
      <div>
        <h3 className="font-semibold">Install Nuri App</h3>
        <p className="text-sm text-muted-foreground">Get quick access to Nuri on your device</p>
      </div>
      <Button onClick={handleInstallClick} variant="default">
        Install
      </Button>
    </div>
  );
}