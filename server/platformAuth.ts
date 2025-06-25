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

      console.log(`Initiating OAuth for user ${(req.user as any).id} on platform ${platform}`);

      // Check if user already has an active connection for this platform
      const existingConnections = await storage.getAccountConnections((req.user as any).id, platform);
      const activeConnection = existingConnections.find(conn => conn.isActive === 1);
      
      if (activeConnection) {
        return res.json({ 
          success: true, 
          connection: activeConnection,
          message: `You already have an active ${config.name} account connected`,
          isExisting: true
        });
      }

      // Generate OAuth URL with state parameter for security
      const state = Buffer.from(JSON.stringify({
        userId: (req.user as any).id,
        platform,
        timestamp: Date.now()
      })).toString('base64');

      // Use the exact redirect URI configured in Google Cloud Console
      let redirectUri: string;
      if (platform === 'google-ads') {
        // For Replit deployments, use the .replit.app domain
        const host = req.get('host');
        if (host?.includes('replit.app')) {
          redirectUri = `https://${host}/api/auth/${platform}/callback`;
        } else {
          // For local development, Google needs exact URI match
          redirectUri = `http://localhost:5000/api/auth/${platform}/callback`;
        }
      } else {
        redirectUri = `${req.protocol}://${req.get('host')}/api/auth/${platform}/callback`;
      }
      
      let authUrl: string;
      
      switch (platform) {
        case 'google-ads':
          if (!process.env.GOOGLE_ADS_CLIENT_ID) {
            return res.status(500).json({ 
              message: "Google Ads OAuth not configured. Please add GOOGLE_ADS_CLIENT_ID to environment variables.",
              needsSetup: true 
            });
          }
          
          console.log(`Google Ads OAuth URL - Client ID: ${process.env.GOOGLE_ADS_CLIENT_ID}`);
          console.log(`Google Ads OAuth URL - Redirect URI: ${redirectUri}`);
          
          // For demo purposes, simulate the OAuth flow since Google Ads API requires business verification
          return res.json({
            success: true,
            isDemo: true,
            message: "Google Ads requires business verification. Using demo mode for testing.",
            demoNote: "This demonstrates the audit workflow. Real implementation requires Google Ads API approval.",
            authUrl: `/api/auth/${platform}/demo-connect`
          });
          
        case 'google-analytics':
          if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ 
              message: "Google Analytics OAuth not configured. Please add GOOGLE_CLIENT_ID to environment variables.",
              needsSetup: true 
            });
          }
          authUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(config.scope)}&` +
            `response_type=code&` +
            `access_type=offline&` +
            `state=${state}`;
          break;
          
        case 'facebook-ads':
          return res.status(501).json({
            message: "Facebook Ads OAuth requires app registration. Please contact support for setup instructions.",
            needsSetup: true,
            setupInstructions: "Create a Facebook App in Meta for Developers and add Facebook Marketing API permissions."
          });
          
        case 'tiktok-ads':
          return res.status(501).json({
            message: "TikTok Ads OAuth requires business account approval. Please contact support for setup instructions.",
            needsSetup: true,
            setupInstructions: "Apply for TikTok for Business API access and get approved by TikTok."
          });
          
        case 'microsoft-ads':
          return res.status(501).json({
            message: "Microsoft Ads OAuth requires Microsoft Advertising account. Please contact support for setup instructions.", 
            needsSetup: true,
            setupInstructions: "Register your app in Microsoft Ads and get API approval."
          });
          
        default:
          return res.status(400).json({ message: "Unsupported platform" });
      }

      // This shouldn't be reached due to individual platform handling above
      res.json({ 
        success: true, 
        authUrl,
        message: `Redirecting to ${config.name} for authorization...`
      });
    } catch (error) {
      console.error("Platform auth error:", error);
      res.status(500).json({ 
        message: "Failed to initiate platform connection", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // OAuth callback handlers
  app.get("/api/auth/:platform/callback", requireAuth, async (req, res) => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`/?error=oauth_declined&platform=${platform}`);
      }

      if (!code || !state) {
        return res.redirect(`/?error=oauth_invalid&platform=${platform}`);
      }

      // Decode and verify state
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      if (stateData.userId !== (req.user as any).id) {
        return res.redirect(`/?error=oauth_security&platform=${platform}`);
      }

      const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
      if (!config) {
        return res.redirect(`/?error=unsupported_platform&platform=${platform}`);
      }

      // Exchange code for access token
      let tokenData;
      // Use the same redirect URI logic as in the auth initiation
      let redirectUri: string;
      if (platform === 'google-ads') {
        const host = req.get('host');
        if (host?.includes('replit.app')) {
          redirectUri = `https://${host}/api/auth/${platform}/callback`;
        } else {
          redirectUri = `http://localhost:5000/api/auth/${platform}/callback`;
        }
      } else {
        redirectUri = `${req.protocol}://${req.get('host')}/api/auth/${platform}/callback`;
      }

      try {
        if (platform === 'google-ads') {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
              client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
              code: code as string,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri
            })
          });
          tokenData = await tokenResponse.json();
        } else if (platform === 'google-analytics') {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              code: code as string,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri
            })
          });
          tokenData = await tokenResponse.json();
        }

        if (!tokenData?.access_token) {
          throw new Error('Failed to obtain access token');
        }

        // Fetch account information based on platform
        let accountInfo = { id: 'real_account', name: `Real ${config.name} Account` };
        
        if (platform === 'google-ads') {
          try {
            const accountResponse = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
              headers: { 
                'Authorization': `Bearer ${tokenData.access_token}`,
                'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
              }
            });
            const accountData = await accountResponse.json();
            console.log('Google Ads API response:', accountData);
            
            if (accountData.resourceNames?.length > 0) {
              // Use the first accessible customer
              const customerId = accountData.resourceNames[0].replace('customers/', '');
              accountInfo.id = customerId;
              accountInfo.name = `Google Ads Account (${customerId})`;
            } else if (accountData.error) {
              console.error('Google Ads API error:', accountData.error);
              accountInfo.name = 'Google Ads Account (Limited Access)';
            }
          } catch (apiError) {
            console.error('Google Ads API call failed:', apiError);
            accountInfo.name = 'Google Ads Account (API Error)';
          }
        }

        // Store the connection
        const connection = await storage.createAccountConnection({
          userId: (req.user as any).id,
          platform,
          accountId: accountInfo.id,
          accountName: accountInfo.name,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          isActive: 1
        });

        res.redirect(`/?success=connected&platform=${platform}&account=${encodeURIComponent(connection.accountName)}`);
      } catch (tokenError) {
        console.error('Token exchange error:', tokenError);
        res.redirect(`/?error=oauth_token&platform=${platform}`);
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect(`/?error=oauth_callback&platform=${platform}`);
    }
  });

  // Demo connection for platforms requiring special approval
  app.get("/api/auth/:platform/demo-connect", requireAuth, async (req, res) => {
    try {
      const { platform } = req.params;
      const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
      
      if (!config) {
        return res.redirect(`/?error=unsupported_platform&platform=${platform}`);
      }

      // Create demo connection with clear labeling
      const connection = await storage.createAccountConnection({
        userId: (req.user as any).id,
        platform,
        accountId: `demo_verified_${platform}_${Date.now()}`,
        accountName: `Demo ${config.name} Account (Sandbox)`,
        accessToken: `demo_token_${platform}`,
        refreshToken: null,
        expiresAt: new Date(Date.now() + 24 * 3600000), // 24 hours
        isActive: 1
      });

      res.redirect(`/?success=demo_connected&platform=${platform}&account=${encodeURIComponent(connection.accountName)}`);
    } catch (error) {
      console.error("Demo connection error:", error);
      res.redirect(`/?error=demo_connection&platform=${platform}`);
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