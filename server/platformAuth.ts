import { Express, RequestHandler } from "express";
import { storage } from "./storage";

const PLATFORM_CONFIGS = {
  "google-ads": {
    name: "Google Ads",
    scope: "https://www.googleapis.com/auth/adwords",
    authUrl: "https://accounts.google.com/oauth/authorize",
    tokenUrl: "https://oauth2.googleapis.com/token"
  },
  "google-analytics": {
    name: "Google Analytics", 
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    authUrl: "https://accounts.google.com/oauth/authorize",
    tokenUrl: "https://oauth2.googleapis.com/token"
  },
  "facebook-ads": {
    name: "Facebook Ads",
    scope: "ads_management,ads_read",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token"
  },
  "tiktok-ads": {
    name: "TikTok Ads",
    scope: "business_management",
    authUrl: "https://ads.tiktok.com/marketing_api/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token"
  },
  "microsoft-ads": {
    name: "Microsoft Ads",
    scope: "bingads.manage",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  }
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export function setupPlatformAuth(app: Express) {
  
  // Main OAuth initiation endpoint
  app.get("/api/auth/:platform", requireAuth, async (req, res) => {
    try {
      const { platform } = req.params;
      const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
      
      if (!config) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      console.log(`Initiating OAuth for user ${(req.user as any).id} on platform ${platform}`);
      
      // Check if user already has this platform connected
      const existingConnections = await storage.getAccountConnections((req.user as any).id, platform);
      if (existingConnections.length > 0) {
        return res.json({
          success: true,
          connection: existingConnections[0],
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

      // Build redirect URI based on current environment
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/${platform}/callback`;
      
      let authUrl: string;
      
      switch (platform) {
        case 'google-ads':
          if (!process.env.GOOGLE_ADS_CLIENT_ID) {
            return res.status(500).json({ 
              message: "Google Ads OAuth not configured. Please add GOOGLE_ADS_CLIENT_ID to environment variables.",
              needsSetup: true 
            });
          }
          
          authUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${process.env.GOOGLE_ADS_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(config.scope)}&` +
            `response_type=code&` +
            `access_type=offline&` +
            `state=${state}`;
          
          console.log(`Google Ads OAuth - Redirect URI: ${redirectUri}`);
          break;
          
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

      res.json({ 
        success: true, 
        authUrl,
        message: `Redirecting to ${config.name} for authorization...`,
        redirectUri: redirectUri,
        setupNote: platform === 'google-ads' ? 
          `Add this redirect URI to Google Cloud Console: ${redirectUri}` : 
          undefined
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
        return res.redirect(`/?error=invalid_callback&platform=${platform}`);
      }

      // Verify state parameter
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
        if (stateData.userId !== (req.user as any).id || stateData.platform !== platform) {
          return res.redirect(`/?error=invalid_state&platform=${platform}`);
        }
      } catch {
        return res.redirect(`/?error=invalid_state&platform=${platform}`);
      }

      const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
      if (!config) {
        return res.redirect(`/?error=unsupported_platform&platform=${platform}`);
      }

      // Exchange code for access token
      let tokenData;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/${platform}/callback`;

      try {
        switch (platform) {
          case 'google-ads':
            if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
              console.error("Missing Google Ads credentials");
              return res.redirect(`/?error=missing_credentials&platform=${platform}`);
            }
            
            console.log("Exchanging Google Ads authorization code for tokens...");
            
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.GOOGLE_ADS_CLIENT_ID,
                client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
                code: code as string,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
              }),
            });
            
            tokenData = await tokenResponse.json();
            
            if (tokenData.error) {
              console.error("Google Ads token exchange error:", tokenData);
              return res.redirect(`/?error=token_exchange&platform=${platform}&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
            }
            
            console.log("Google Ads tokens received successfully");
            break;

          case 'google-analytics':
            if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
              console.error("Missing Google Analytics credentials");
              return res.redirect(`/?error=missing_credentials&platform=${platform}`);
            }
            
            const gaTokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code as string,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
              }),
            });
            
            tokenData = await gaTokenResponse.json();
            
            if (tokenData.error) {
              console.error("Google Analytics token exchange error:", tokenData);
              return res.redirect(`/?error=token_exchange&platform=${platform}&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
            }
            break;

          default:
            return res.redirect(`/?error=platform_not_implemented&platform=${platform}`);
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

        console.log(`Successfully created ${platform} connection:`, connection);
        res.redirect(`/?success=connected&platform=${platform}&account=${encodeURIComponent(connection.accountName)}`);

      } catch (tokenError) {
        console.error("Token exchange error:", tokenError);
        res.redirect(`/?error=oauth_token&platform=${platform}`);
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect(`/?error=oauth_callback&platform=${platform}`);
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

      // Generate mock advertising data based on platform for testing
      const mockData = generateMockPlatformData(platform, connection.accountName);
      
      res.json(mockData);
    } catch (error) {
      console.error("Failed to fetch platform data:", error);
      res.status(500).json({ message: "Failed to fetch platform data" });
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
          }
        ],
        totalSpend: 5600.00,
        totalReach: 83000,
        totalImpressions: 280000,
        totalClicks: 4750,
        totalConversions: 159,
        averageRoas: 2.99
      };

    default:
      return {
        ...baseData,
        message: "Platform data simulation not implemented"
      };
  }
}