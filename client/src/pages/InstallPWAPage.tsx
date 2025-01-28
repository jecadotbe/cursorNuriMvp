import { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

export default function InstallPWAPage() {
  // Force trigger the beforeinstallprompt event
  useEffect(() => {
    const e = new Event('beforeinstallprompt');
    window.dispatchEvent(e);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          <Smartphone className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-center">Install Nuri App</h1>
          <p className="text-center text-muted-foreground">
            This is a test page for installing Nuri as a Progressive Web App on your device.
          </p>
          <p className="text-sm text-center text-muted-foreground">
            You should see an installation prompt appear automatically.
            If not, check your browser's menu for an "Add to Home Screen" or "Install" option.
          </p>
          <div className="w-full max-w-xs mt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.dispatchEvent(new Event('beforeinstallprompt'))}
            >
              Trigger Install Prompt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
