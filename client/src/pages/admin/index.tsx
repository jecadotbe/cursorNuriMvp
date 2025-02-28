import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, MessageSquare, Database, Settings, Shield } from "lucide-react";
import UserManagement from "@/pages/admin/user-management";

export default function AdminDashboard() {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect non-admin users to home
    if (!isLoading && (!user || !user.isAdmin)) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="container mx-auto py-10">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.username}</p>
          </div>
          <Button onClick={() => setLocation("/")} variant="outline">
            Return to App
          </Button>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard 
              title="Total Users" 
              value="--" 
              description="Registered accounts"
              icon={<Users className="h-4 w-4" />}
            />
            <DashboardCard 
              title="Active Chats" 
              value="--" 
              description="Last 24 hours"
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <DashboardCard 
              title="Database Size" 
              value="--" 
              description="Total records"
              icon={<Database className="h-4 w-4" />}
            />
            <DashboardCard 
              title="Admin Users" 
              value="--" 
              description="With admin privileges"
              icon={<Shield className="h-4 w-4" />}
            />
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <Button>Create Admin User</Button>
              <Button variant="outline">Generate Reports</Button>
              <Button variant="outline">System Check</Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="chats">
          <Card>
            <CardHeader>
              <CardTitle>Chat Management</CardTitle>
              <CardDescription>View and manage user conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Chat management features will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>Monitor and manage database health</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Database management features will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>Configure admin dashboard settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Settings configuration will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function DashboardCard({ title, value, description, icon }: DashboardCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}