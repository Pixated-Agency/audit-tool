import { Express } from "express";
import { requireAuth } from "./googleAuth";
import { storage } from "./storage";

// Platform OAuth configurations
const PLATFORM_CONFIGS = {
  "google-ads": {
    name: "Google Ads",
    authUrl: "https://accounts.google.com/oauth/authorize",
    scope: "https://www.googleapis.com/auth/adwords",
    apiBase: "https://googleads.googleapis.com/v14"
  },
  "google-analytics": {
    name: "Google Analytics",
    authUrl: "https://accounts.google.com/oauth/authorize", 
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    apiBase: "https://analyticsreporting.googleapis.com/v4"
  },
  "facebook-ads": {
    name: "Facebook Ads",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    scope: "ads_read,ads_management",
    apiBase: "https://graph.facebook.com/v18.0"
  },
  "tiktok-ads": {
    name: "TikTok Ads",
    authUrl: "https://ads.tiktok.com/marketing_api/auth",
    scope: "advertiser_read,campaign_read",
    apiBase: "https://business-api.tiktok.com/open_api/v1.3"
  },
  "microsoft-ads": {
    name: "Microsoft Ads",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "https://ads.microsoft.com/ads.manage",
    apiBase: "https://advertising.microsoft.com/api/advertiser"
  }
};

export function setupPlatformAuth(app: Express) {
  // Initiate OAuth for a platform
  app.get("/api/auth/:platform", requireAuth, async (req, res) => {
    try {
      const { platform } = req.params;
      const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
      
      if (!config) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      console.log(`Creating connection for user ${(req.user as any).id} on platform ${platform}`);

      // For demo purposes, we'll simulate OAuth success
      // In production, this would redirect to the actual OAuth provider
      
      // Store mock connection for demo
      const mockConnection = await storage.createAccountConnection({
        userId: (req.user as any).id,
        platform,
        accountId: `demo_${platform}_${Date.now()}`,
        accountName: `Demo ${config.name} Account`,
        accessToken: `mock_token_${platform}`,
        refreshToken: `mock_refresh_${platform}`,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        isActive: 1
      });

      console.log(`Successfully created connection:`, mockConnection);

      res.json({ 
        success: true, 
        connection: mockConnection,
        message: `Successfully connected to ${config.name}`
      });
    } catch (error) {
      console.error("Platform auth error:", error);
      res.status(500).json({ message: "Failed to connect platform", error: error.message });
    }
  });

  // Get platform data for audit
  app.get("/api/platform-data/:platform/:accountId", requireAuth, async (req, res) => {
    try {
      const { platform, accountId } = req.params;
      const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
      
      if (!config) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      // Verify user owns this connection
      const connection = await storage.getAccountConnection(parseInt(accountId));
      if (!connection || connection.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Account connection not found" });
      }

      // Generate mock advertising data based on platform
      const mockData = generateMockPlatformData(platform, connection.accountName);
      
      res.json(mockData);
    } catch (error) {
      console.error("Failed to fetch platform data:", error);
      res.status(500).json({ message: "Failed to fetch platform data" });
    }
  });

  // TikTok Ads OAuth simulation
  app.get("/api/auth/tiktok-ads", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const platform = "tiktok-ads";
      
      console.log(`Creating connection for user ${userId} on platform ${platform}`);

      const mockConnection = await storage.createAccountConnection({
        userId: (req.user as any).id,
        platform,
        accountId: `demo_${platform}_${Date.now()}`,
        accountName: `Demo TikTok Ads Account`,
        accessToken: `mock_token_${platform}`,
        refreshToken: `mock_refresh_${platform}`,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        isActive: 1
      });

      console.log(`Successfully created connection:`, mockConnection);

      res.json({ 
        success: true, 
        connection: mockConnection,
        message: "Successfully connected to TikTok Ads"
      });
    } catch (error) {
      console.error("Platform auth error:", error);
      res.status(500).json({ 
        message: "Failed to connect platform", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Microsoft Ads OAuth simulation
  app.get("/api/auth/microsoft-ads", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const platform = "microsoft-ads";
      
      console.log(`Creating connection for user ${userId} on platform ${platform}`);

      const mockConnection = await storage.createAccountConnection({
        userId: (req.user as any).id,
        platform,
        accountId: `demo_${platform}_${Date.now()}`,
        accountName: `Demo Microsoft Ads Account`,
        accessToken: `mock_token_${platform}`,
        refreshToken: `mock_refresh_${platform}`,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        isActive: 1
      });

      console.log(`Successfully created connection:`, mockConnection);

      res.json({ 
        success: true, 
        connection: mockConnection,
        message: "Successfully connected to Microsoft Ads"
      });
    } catch (error) {
      console.error("Platform auth error:", error);
      res.status(500).json({ 
        message: "Failed to connect platform", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Google Analytics OAuth simulation
  app.get("/api/auth/google-analytics", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const platform = "google-analytics";
      
      console.log(`Creating connection for user ${userId} on platform ${platform}`);

      const mockConnection = await storage.createAccountConnection({
        userId: (req.user as any).id,
        platform,
        accountId: `demo_${platform}_${Date.now()}`,
        accountName: `Demo Google Analytics Account`,
        accessToken: `mock_token_${platform}`,
        refreshToken: `mock_refresh_${platform}`,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        isActive: 1
      });

      console.log(`Successfully created connection:`, mockConnection);

      res.json({ 
        success: true, 
        connection: mockConnection,
        message: "Successfully connected to Google Analytics"
      });
    } catch (error) {
      console.error("Platform auth error:", error);
      res.status(500).json({ 
        message: "Failed to connect platform", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}

function generateMockPlatformData(platform: string, accountName: string) {
  const baseData = {
    accountName,
    platform,
    dateRange: "Last 30 days",
    currency: "USD"
  };

  switch (platform) {
    case "google-ads":
      return {
        ...baseData,
        campaigns: [
          {
            name: "Search Campaign 1",
            impressions: 125000,
            clicks: 3200,
            ctr: 2.56,
            cost: 4800.50,
            conversions: 85,
            conversionRate: 2.66,
            cpc: 1.50
          },
          {
            name: "Display Campaign 1", 
            impressions: 890000,
            clicks: 2100,
            ctr: 0.24,
            cost: 1250.25,
            conversions: 22,
            conversionRate: 1.05,
            cpc: 0.60
          }
        ],
        totalSpend: 6050.75,
        totalImpressions: 1015000,
        totalClicks: 5300,
        totalConversions: 107,
        averageCpc: 1.14
      };

    case "facebook-ads":
      return {
        ...baseData,
        adSets: [
          {
            name: "Interest Targeting",
            reach: 45000,
            impressions: 156000,
            clicks: 2800,
            ctr: 1.79,
            cost: 3200.00,
            conversions: 92,
            roas: 2.87
          },
          {
            name: "Lookalike Audience",
            reach: 38000,
            impressions: 124000,
            clicks: 1950,
            ctr: 1.57,
            cost: 2400.00,
            conversions: 67,
            roas: 3.12
          }
        ],
        totalSpend: 5600.00,
        totalReach: 83000,
        totalImpressions: 280000,
        totalClicks: 4750,
        totalConversions: 159,
        averageRoas: 2.99
      };

    case "tiktok-ads":
      return {
        ...baseData,
        campaigns: [
          {
            name: "Video Campaign",
            videoViews: 245000,
            impressions: 890000,
            clicks: 12500,
            ctr: 1.40,
            cost: 1800.00,
            conversions: 78,
            videoCompletionRate: 0.68
          }
        ],
        totalSpend: 1800.00,
        totalVideoViews: 245000,
        totalImpressions: 890000,
        totalClicks: 12500,
        averageCompletionRate: 0.68
      };

    default:
      return {
        ...baseData,
        campaigns: [
          {
            name: "Sample Campaign",
            impressions: 100000,
            clicks: 2000,
            cost: 1000.00,
            conversions: 50
          }
        ],
        totalSpend: 1000.00
      };
  }
}

export { PLATFORM_CONFIGS };