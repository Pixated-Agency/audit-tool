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
