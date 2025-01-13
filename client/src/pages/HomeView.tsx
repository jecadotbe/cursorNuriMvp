import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { MessageSquare, Users, GraduationCap } from "lucide-react";
import { Link } from "wouter";

export default function HomeView() {
  const { user } = useUser();

  const sections = [
    {
      title: "Chat with Nuri",
      description: "Get personalized support and guidance",
      icon: <MessageSquare className="h-6 w-6" />,
      href: "/chat",
      gradient: "from-blue-50 to-indigo-50",
    },
    {
      title: "Your Village",
      description: "Visualize and manage your support network",
      icon: <Users className="h-6 w-6" />,
      href: "/village",
      gradient: "from-green-50 to-emerald-50",
    },
    {
      title: "Learn & Grow",
      description: "Access curated learning materials",
      icon: <GraduationCap className="h-6 w-6" />,
      href: "/learn",
      gradient: "from-yellow-50 to-orange-50",
    },
  ];

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Welcome, {user?.username}</h1>
        <p className="text-gray-500">What would you like to explore today?</p>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              className={`bg-gradient-to-br ${section.gradient} hover:shadow-md transition-shadow cursor-pointer`}
            >
              <CardHeader className="flex flex-row items-center space-x-4">
                <div className="bg-white rounded-full p-2">{section.icon}</div>
                <div>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
