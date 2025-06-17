import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic auth routes - no authentication required for now
  app.get('/api/auth/user', async (req, res) => {
    // Return null for unauthenticated state
    res.json(null);
  });

  // Basic route example
  app.get("/api/health", async (req, res) => {
    res.json({ message: "Server is running", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
