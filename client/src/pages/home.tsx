import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, TrendingUp, DollarSign, Users, Eye } from "lucide-react";
import { SiFacebook } from "react-icons/si";

export default function Home() {
  const { user } = useAuth();

  const handleLogout = () => {
    // Simple logout - in a real app this would clear session/tokens
    window.location.href = "/";
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-meta-blue rounded-xl flex items-center justify-center shadow-md">
                <SiFacebook className="text-white text-lg" />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-neutral-800">Meta Ads Auditor</h1>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || ""} alt="Profile" />
                  <AvatarFallback className="bg-meta-blue text-white text-sm">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-neutral-800">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "User"
                    }
                  </p>
                  <p className="text-xs text-neutral-600">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-800 mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </h2>
          <p className="text-neutral-600">
            Ready to optimize your Meta advertising campaigns? Let's dive into your ad performance.
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-auth hover:shadow-auth-hover transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-meta-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-800">$0.00</div>
              <p className="text-xs text-neutral-500">No campaigns connected yet</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-auth hover:shadow-auth-hover transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Impressions</CardTitle>
              <Eye className="h-4 w-4 text-meta-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-800">0</div>
              <p className="text-xs text-neutral-500">Connect your Meta account</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-auth hover:shadow-auth-hover transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-meta-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-800">0</div>
              <p className="text-xs text-neutral-500">Start auditing to see data</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-auth hover:shadow-auth-hover transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Reach</CardTitle>
              <Users className="h-4 w-4 text-meta-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-800">0</div>
              <p className="text-xs text-neutral-500">Link your ad accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        <Card className="bg-white shadow-auth">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-neutral-800">
              Get Started with Meta Ads Auditing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-neutral-600">
              <p className="mb-4">
                Welcome to Meta Ads Auditor! To start analyzing your advertising performance, follow these steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Connect your Meta Business account</li>
                <li>Select the ad accounts you want to audit</li>
                <li>Configure your performance thresholds</li>
                <li>Run your first audit and get actionable insights</li>
              </ol>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-meta-blue hover:bg-meta-blue-dark text-white">
                Connect Meta Account
              </Button>
              <Button variant="outline" className="border-meta-blue text-meta-blue hover:bg-meta-blue hover:text-white">
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
