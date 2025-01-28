import { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Share2, Menu, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InstallPWAPage() {
  const { toast } = useToast();

  const handleInstallClick = () => {
    toast({
      title: "Installation Instructions",
      description: "Look for the install option in your browser's menu or the 'Add to Home Screen' option on mobile devices.",
      duration: 5000
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center gap-6">
          <Smartphone className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-center">Install Nuri App</h1>

          <div className="space-y-6 w-full">
            <div className="space-y-2">
              <h2 className="font-semibold">On iOS Safari:</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4" />
                <span>Tap the Share button</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plus className="h-4 w-4" />
                <span>Select 'Add to Home Screen'</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-semibold">On Android Chrome:</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Menu className="h-4 w-4" />
                <span>Open browser menu</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plus className="h-4 w-4" />
                <span>Select 'Install app' or 'Add to Home screen'</span>
              </div>
            </div>
          </div>

          <div className="w-full pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleInstallClick}
            >
              Show Installation Options
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Installing as a PWA will give you a native app-like experience with offline capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}