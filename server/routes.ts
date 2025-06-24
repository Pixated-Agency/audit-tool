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

  // Protected route example
  app.get("/api/protected", requireAuth, async (req, res) => {
    res.json({ message: "Protected route accessed", user: req.user });
  });

  // Health check route
  app.get("/api/health", async (req, res) => {
    res.json({ message: "Server is running", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
