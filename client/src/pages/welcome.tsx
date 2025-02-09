
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function WelcomePage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center animate-gradient" 
      style={{
        backgroundSize: "400% 400%",
        background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
      }}>
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src="/images/nuri_chat.png"
              alt="Nuri Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-baskerville">Dag {user?.username}</h1>
          <h2 className="text-2xl font-baskerville">Welkom bij Nuri</h2>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-gray-700">
            De onboarding zal +-5/10 minuten duren. We vragen je al enkele persoonlijke zaken om je beter te leren kennen.
          </p>

          <div className="space-y-2 pt-4">
            <p>
              <LucideChat className="inline-block mr-2" />
              Chat met Nuri.
            </p>
            <p>
              <LucideUsers className="inline-block mr-2" />
              Bouw je persoonlijke netwerk
            </p>
            <p>
              <LucideBook className="inline-block mr-2" />
              Leer op je eigen tempo
            </p>
          </div>
        </div>

        <Button 
          onClick={() => setLocation("/onboarding")}
          className="w-full mt-8"
        >
          Start onboarding
        </Button>
      </div>
    </div>
  );
}
