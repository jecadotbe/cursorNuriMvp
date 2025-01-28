import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      console.log('PWA: beforeinstallprompt event fired');

      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches;
    console.log('PWA: Is app installed?', isAppInstalled);

    if (isAppInstalled) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('PWA: No deferred prompt available');
      toast({
        title: "Installation not available",
        description: "Please use your browser's menu to install this app, or try accessing it on a mobile device.",
        duration: 5000
      });
      return;
    }

    try {
      console.log('PWA: Triggering install prompt');
      // Show the install prompt
      const promptResult = await deferredPrompt.prompt();
      console.log('PWA: Prompt result:', promptResult);

      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      console.log('PWA: User choice:', choiceResult);

      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted the installation prompt');
        setShowPrompt(false);
      } else {
        console.log('PWA: User dismissed the installation prompt');
      }
    } catch (error) {
      console.error('PWA: Error during installation:', error);
      toast({
        title: "Installation failed",
        description: "There was an error installing the app. Please try using your browser's install option instead.",
        variant: "destructive",
        duration: 5000
      });
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