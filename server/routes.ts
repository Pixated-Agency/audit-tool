import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupGoogleAuth, requireAuth } from "./googleAuth";

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
      const { name, platform, accountId, accountName, reportFormat } = req.body;
      
      const audit = await storage.createAudit({
        name,
        platform,
        accountId,
        accountName,
        reportFormat,
        createdBy: (req.user as any).id,
        status: "processing"
      });

      // Simulate audit processing - in real implementation this would trigger actual audit
      setTimeout(async () => {
        try {
          await storage.updateAudit(audit.id, {
            status: "completed",
            completedAt: new Date(),
            reportUrl: `/reports/audit-${audit.id}.${reportFormat}`
          });
        } catch (error) {
          console.error("Failed to update audit status:", error);
        }
      }, 5000); // 5 seconds for demo

      res.json(audit);
    } catch (error) {
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

  // Health check route
  app.get("/api/health", async (req, res) => {
    res.json({ message: "Server is running", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
