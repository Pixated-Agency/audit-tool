import {
  users,
  audits,
  accountConnections,
  type User,
  type UpsertUser,
  type Audit,
  type UpsertAudit,
  type AccountConnection,
  type UpsertAccountConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, user: Partial<UpsertUser>): Promise<User>;
  
  // Audit operations
  getAudits(userId: number): Promise<Audit[]>;
  getAudit(id: number): Promise<Audit | undefined>;
  createAudit(audit: UpsertAudit): Promise<Audit>;
  updateAudit(id: number, audit: Partial<UpsertAudit>): Promise<Audit>;
  deleteAudit(id: number): Promise<void>;
  
  // Account connection operations
  getAccountConnections(userId: number, platform?: string): Promise<AccountConnection[]>;
  getAccountConnection(id: number): Promise<AccountConnection | undefined>;
  createAccountConnection(connection: UpsertAccountConnection): Promise<AccountConnection>;
  updateAccountConnection(id: number, connection: Partial<UpsertAccountConnection>): Promise<AccountConnection>;
  deleteAccountConnection(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db = db;

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Audit operations
  async getAudits(userId: number): Promise<Audit[]> {
    const result = await this.db
      .select()
      .from(audits)
      .where(eq(audits.createdBy, userId))
      .orderBy(desc(audits.createdAt));
    return result;
  }

  async getAudit(id: number): Promise<Audit | undefined> {
    const [audit] = await this.db.select().from(audits).where(eq(audits.id, id));
    return audit;
  }

  async createAudit(auditData: UpsertAudit): Promise<Audit> {
    const [audit] = await this.db.insert(audits).values(auditData).returning();
    return audit;
  }

  async updateAudit(id: number, auditData: Partial<UpsertAudit>): Promise<Audit> {
    const [audit] = await this.db
      .update(audits)
      .set({ ...auditData, updatedAt: new Date() })
      .where(eq(audits.id, id))
      .returning();
    return audit;
  }

  async deleteAudit(id: number): Promise<void> {
    await this.db.delete(audits).where(eq(audits.id, id));
  }

  // Account connection operations
  async getAccountConnections(userId: number, platform?: string): Promise<AccountConnection[]> {
    const baseQuery = this.db.select().from(accountConnections).where(eq(accountConnections.userId, userId));
    
    if (platform) {
      return await baseQuery.where(eq(accountConnections.platform, platform));
    }
    
    return await baseQuery;
  }

  async getAccountConnection(id: number): Promise<AccountConnection | undefined> {
    const [connection] = await this.db.select().from(accountConnections).where(eq(accountConnections.id, id));
    return connection;
  }

  async createAccountConnection(connectionData: UpsertAccountConnection): Promise<AccountConnection> {
    // Ensure all data types match the database schema
    const cleanData = {
      userId: Number(connectionData.userId),
      platform: String(connectionData.platform),
      accountId: String(connectionData.accountId),
      accountName: String(connectionData.accountName),
      accessToken: connectionData.accessToken ? String(connectionData.accessToken) : null,
      refreshToken: connectionData.refreshToken ? String(connectionData.refreshToken) : null,
      expiresAt: connectionData.expiresAt ? new Date(connectionData.expiresAt) : null,
      isActive: Number(connectionData.isActive === true ? 1 : connectionData.isActive === false ? 0 : connectionData.isActive || 1)
    };
    console.log('Creating connection with cleaned data:', cleanData);
    const [connection] = await this.db.insert(accountConnections).values(cleanData).returning();
    return connection;
  }

  async updateAccountConnection(id: number, connectionData: Partial<UpsertAccountConnection>): Promise<AccountConnection> {
    const [connection] = await this.db
      .update(accountConnections)
      .set({ ...connectionData, updatedAt: new Date() })
      .where(eq(accountConnections.id, id))
      .returning();
    return connection;
  }

  async deleteAccountConnection(id: number): Promise<void> {
    await this.db.delete(accountConnections).where(eq(accountConnections.id, id));
  }
}

export const storage = new DatabaseStorage();
