import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Eye, Download, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { SiFacebook, SiGoogle, SiTiktok } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Audit {
  id: number;
  name: string;
  platform: string;
  status: string;
  accountId: string | null;
  accountName: string | null;
  reportFormat: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  reportUrl: string | null;
}

interface CreateAuditData {
  name: string;
  platform: string;
  connectionId: number;
  reportFormat: string;
}

interface AccountConnection {
  id: number;
  platform: string;
  accountId: string;
  accountName: string;
  isActive: boolean;
}

const platforms = [
  { value: "google-ads", label: "Google Ads", icon: SiGoogle },
  { value: "google-analytics", label: "Google Analytics", icon: SiGoogle },
  { value: "facebook-ads", label: "Facebook Ads", icon: SiFacebook },
  { value: "tiktok-ads", label: "TikTok Ads", icon: SiTiktok },
  { value: "microsoft-ads", label: "Microsoft Ads", icon: SiGoogle },
];

const reportFormats = [
  { value: "pdf", label: "PDF" },
  { value: "powerpoint", label: "PowerPoint" },
  { value: "google-slides", label: "Google Slides" },
  { value: "google-doc", label: "Google Doc" },
];

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [auditData, setAuditData] = useState<Partial<CreateAuditData>>({});
  const [selectedConnection, setSelectedConnection] = useState<AccountConnection | null>(null);

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["/api/audits"],
    enabled: !!user,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["/api/account-connections", auditData.platform],
    enabled: !!user && !!auditData.platform,
  });

  const createAuditMutation = useMutation({
    mutationFn: (data: CreateAuditData) => apiRequest("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setIsCreateDialogOpen(false);
      setCurrentStep(1);
      setAuditData({});
      setSelectedConnection(null);
      toast({
        title: "Audit Created",
        description: "Your audit is being processed with AI analysis and will be ready shortly.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create audit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const connectPlatformMutation = useMutation({
    mutationFn: (platform: string) => apiRequest(`/api/auth/${platform}`, {
      method: "GET",
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account-connections", auditData.platform] });
      toast({
        title: "Account Connected",
        description: data.message || "Successfully connected account",
      });
    },
    onError: (error) => {
      console.error("Platform connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAuditMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/audits/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Audit Deleted",
        description: "The audit has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete audit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const getPlatformIcon = (platform: string) => {
    const platformConfig = platforms.find(p => p.value === platform);
    if (!platformConfig) return SiFacebook;
    return platformConfig.icon;
  };

  const getPlatformLabel = (platform: string) => {
    const platformConfig = platforms.find(p => p.value === platform);
    return platformConfig?.label || platform;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateAudit = () => {
    if (auditData.name && auditData.platform && auditData.connectionId && auditData.reportFormat) {
      createAuditMutation.mutate(auditData as CreateAuditData);
    }
  };

  const resetDialog = () => {
    setCurrentStep(1);
    setAuditData({});
    setSelectedConnection(null);
    setIsCreateDialogOpen(false);
  };

  const handleConnectPlatform = () => {
    if (auditData.platform) {
      connectPlatformMutation.mutate(auditData.platform);
    }
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
              <h1 className="ml-3 text-xl font-semibold text-neutral-800">Multi-Platform Ad Auditor</h1>
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
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-neutral-800 mb-2">
              Multi-Platform Audit Dashboard
            </h2>
            <p className="text-neutral-600">
              Manage and monitor your advertising audits across Google, Facebook, TikTok, and Microsoft platforms.
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={resetDialog}>
            <DialogTrigger asChild>
              <Button className="bg-meta-blue hover:bg-meta-blue-dark text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Audit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" aria-describedby="audit-dialog-description">
              <DialogHeader>
                <DialogTitle>Create New Audit - Step {currentStep} of 3</DialogTitle>
                <p id="audit-dialog-description" className="text-sm text-gray-600">
                  {currentStep === 1 && "Select the advertising platform you want to audit"}
                  {currentStep === 2 && "Connect your account using OAuth authentication"}
                  {currentStep === 3 && "Configure your audit report settings"}
                </p>
              </DialogHeader>
              
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Platform</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {platforms.map((platform) => {
                      const Icon = platform.icon;
                      return (
                        <div
                          key={platform.value}
                          className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                            auditData.platform === platform.value
                              ? "border-meta-blue bg-meta-blue/5"
                              : "border-gray-200"
                          }`}
                          onClick={() => setAuditData({ ...auditData, platform: platform.value })}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-6 w-6" />
                            <span className="font-medium">{platform.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setCurrentStep(2)}
                      disabled={!auditData.platform}
                      className="bg-meta-blue hover:bg-meta-blue-dark"
                    >
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connect Account</h3>
                  
                  {connections.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500 mb-4">
                        No {getPlatformLabel(auditData.platform || "")} accounts connected yet.
                      </p>
                      <Button 
                        onClick={handleConnectPlatform}
                        disabled={connectPlatformMutation.isPending}
                        className="bg-meta-blue hover:bg-meta-blue-dark"
                      >
                        {connectPlatformMutation.isPending ? "Connecting..." : `Connect ${getPlatformLabel(auditData.platform || "")} Account`}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Select Connected Account</Label>
                      {connections.map((connection: AccountConnection) => (
                        <div
                          key={connection.id}
                          className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedConnection?.id === connection.id
                              ? "border-meta-blue bg-meta-blue/5"
                              : "border-gray-200"
                          }`}
                          onClick={() => {
                            setSelectedConnection(connection);
                            setAuditData({ ...auditData, connectionId: connection.id });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{connection.accountName}</p>
                              <p className="text-sm text-gray-500">ID: {connection.accountId}</p>
                            </div>
                            {connection.isActive && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        variant="outline" 
                        onClick={handleConnectPlatform}
                        disabled={connectPlatformMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {connectPlatformMutation.isPending ? "Connecting..." : "Connect Another Account"}
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      disabled={!selectedConnection}
                      className="bg-meta-blue hover:bg-meta-blue-dark"
                    >
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customize Audit</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="auditName">Report Name</Label>
                      <Input
                        id="auditName"
                        placeholder="Enter a name for this audit report"
                        value={auditData.name || ""}
                        onChange={(e) => setAuditData({ ...auditData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reportFormat">Report Format</Label>
                      <Select
                        value={auditData.reportFormat || ""}
                        onValueChange={(value) => setAuditData({ ...auditData, reportFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select report format" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportFormats.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={handleCreateAudit}
                      disabled={!auditData.name || !auditData.reportFormat || createAuditMutation.isPending}
                      className="bg-meta-blue hover:bg-meta-blue-dark"
                    >
                      {createAuditMutation.isPending ? "Creating..." : "Run AI Audit"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Audits Table */}
        <Card className="bg-white shadow-auth">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-neutral-800">
              Audit History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-neutral-500">Loading audits...</p>
              </div>
            ) : audits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500 mb-4">No audits created yet.</p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-meta-blue hover:bg-meta-blue-dark text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Audit
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit: Audit) => {
                    const Icon = getPlatformIcon(audit.platform);
                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium">{audit.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{getPlatformLabel(audit.platform)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(audit.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </TableCell>
                        <TableCell>{audit.accountName || audit.accountId}</TableCell>
                        <TableCell>{getStatusBadge(audit.status)}</TableCell>
                        <TableCell>
                          {user?.firstName && user?.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email || "Unknown"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {audit.status === "completed" && (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAuditMutation.mutate(audit.id)}
                              disabled={deleteAuditMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
