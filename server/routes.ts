import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupGoogleAuth, requireAuth } from "./googleAuth";
import { setupPlatformAuth } from "./platformAuth";
import { analyzeAdvertisingData, generateReport } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Google OAuth authentication
  setupGoogleAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.json(null);
    }
  });

  // Test login endpoint for development
  app.post('/api/auth/test-login', async (req, res) => {
    const { email, password } = req.body;
    
    // Test credentials
    if (email === 'test@metaaudit.com' && password === 'testpass123') {
      try {
        // Create or get test user
        let testUser = await storage.getUserByEmail(email);
        if (!testUser) {
          testUser = await storage.createUser({
            email: 'test@metaaudit.com',
            firstName: 'John',
            lastName: 'Doe',
            profileImageUrl: null,
            googleId: null,
          });
        }
        
        // Manually set up session (simplified for testing)
        req.login(testUser, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed' });
          }
          res.json({ message: 'Login successful', user: testUser });
        });
      } catch (error) {
        res.status(500).json({ message: 'Server error during test login' });
      }
    } else {
      res.status(401).json({ message: 'Invalid test credentials' });
    }
  });

  // Audit routes
  app.get("/api/audits", requireAuth, async (req, res) => {
    try {
      const audits = await storage.getAudits((req.user as any).id);
      res.json(audits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.post("/api/audits", requireAuth, async (req, res) => {
    try {
      const { name, platform, connectionId, reportFormat } = req.body;
      
      // Get the account connection
      const connection = await storage.getAccountConnection(connectionId);
      if (!connection || connection.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Account connection not found" });
      }

      const audit = await storage.createAudit({
        name,
        platform,
        accountId: connection.accountId,
        accountName: connection.accountName,
        reportFormat,
        createdBy: (req.user as any).id,
        status: "processing"
      });

      // Process audit in background
      processAudit(audit.id, platform, connection).catch(error => {
        console.error("Audit processing failed:", error);
        storage.updateAudit(audit.id, {
          status: "failed",
          completedAt: new Date()
        });
      });

      res.json(audit);
    } catch (error) {
      console.error("Failed to create audit:", error);
      res.status(500).json({ message: "Failed to create audit" });
    }
  });

  app.delete("/api/audits/:id", requireAuth, async (req, res) => {
    try {
      const auditId = parseInt(req.params.id);
      const audit = await storage.getAudit(auditId);
      
      if (!audit || audit.createdBy !== (req.user as any).id) {
        return res.status(404).json({ message: "Audit not found" });
      }

      await storage.deleteAudit(auditId);
      res.json({ message: "Audit deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete audit" });
    }
  });

  // Account connection routes
  app.get("/api/account-connections", requireAuth, async (req, res) => {
    try {
      const { platform } = req.query;
      const connections = await storage.getAccountConnections(
        (req.user as any).id,
        platform as string
      );
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account connections" });
    }
  });

  // Setup platform authentication routes
  setupPlatformAuth(app);

  // Health check route
  app.get("/api/health", async (req, res) => {
    res.json({ message: "Server is running", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processAudit(auditId: number, platform: string, connection: any) {
  try {
    // Simulate fetching platform data
    const mockData = generateMockPlatformData(platform, connection.accountName);
    
    // Analyze data with ChatGPT
    const analysis = await analyzeAdvertisingData(platform, mockData);
    
    // Generate report
    const reportContent = await generateReport(
      analysis,
      platform,
      connection.accountName,
      "pdf"
    );

    // Update audit with results
    await storage.updateAudit(auditId, {
      status: "completed",
      completedAt: new Date(),
      reportUrl: `/reports/audit-${auditId}.pdf`,
    });

  } catch (error) {
    console.error("Audit processing error:", error);
    throw error;
  }
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
          }
        ],
        totalSpend: 4800.50,
        totalImpressions: 125000,
        totalClicks: 3200,
        totalConversions: 85
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
            cost: 3200.00,
            conversions: 92,
            roas: 2.87
          }
        ],
        totalSpend: 3200.00,
        totalReach: 45000,
        totalImpressions: 156000,
        totalClicks: 2800
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
