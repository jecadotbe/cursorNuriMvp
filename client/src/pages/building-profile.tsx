
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function BuildingProfilePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to home after 6 seconds
    const timer = setTimeout(() => {
      setLocation("/");
    }, 6000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center animate-gradient" 
      style={{
        backgroundSize: "400% 400%",
        background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
      }}>
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <img
              src="/images/nuri_chat.png"
              alt="Nuri Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-baskerville">Building Your Profile</h1>
          <p>Please wait while Nuri personalizes your experience...</p>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Progress value={66} className="w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
