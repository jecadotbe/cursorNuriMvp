import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, Users, GraduationCap, User, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function Navigation() {
  const [location] = useLocation();
  const { user } = useUser();

  const items = [
    { icon: Home, label: "Home", href: "/" },
    { icon: MessageSquare, label: "Nuri", href: "/chat", onboarding: "chat" },
    { icon: Users, label: "Village", href: "/village", onboarding: "village" },
    { icon: GraduationCap, label: "Learn", href: "/learn", onboarding: "learn" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-[#F2F0E5] z-0">
      <nav className="flex justify-between items-center px-4 py-2">
        {items.map(({ icon: Icon, label, href, onboarding }) => (
          <Link key={href} href={href}>
            <button
              type="button"
              data-onboarding={onboarding}
              className={cn(
                "flex flex-col items-center gap-1 p-2",
                location === href
                  ? "text-[#F18303]"
                  : "text-muted-foreground hover:text-[#F18303]"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </button>
          </Link>
        ))}
        
        {user?.isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/admin">
                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-1 p-2",
                      location === "/admin"
                        ? "text-[#F18303]"
                        : "text-muted-foreground hover:text-[#F18303]"
                    )}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="text-xs">Admin</span>
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Admin Dashboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <Link href="/profile">
          <button
            type="button"
            className={cn(
              "flex flex-col items-center gap-1 p-2",
              location === "/profile"
                ? "text-[#F18303]"
                : "text-muted-foreground hover:text-[#F18303]"
            )}
          >
            <Avatar className="h-5 w-5">
              {user?.profilePicture ? (
                <AvatarImage src={user.profilePicture} alt="Profile picture" />
              ) : (
                <AvatarFallback className="text-xs">
                  {user?.username[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-xs">Profiel</span>
          </button>
        </Link>
      </nav>
    </div>
  );
}