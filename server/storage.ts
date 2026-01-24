// Reference: javascript_database blueprint
import {
  users,
  tenants,
  payments,
  maintenanceReports,
  kasunduan,
  settings,
  units,
  type User,
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Payment,
  type InsertPayment,
  type MaintenanceReport,
  type InsertMaintenanceReport,
  type Kasunduan,
  type InsertKasunduan,
  type Settings,
  type InsertSettings,
  type Unit,
  type InsertUnit,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  
  // Tenant methods
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantByUserId(userId: number): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<Tenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<void>;
  
  // Payment methods
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByTenantId(tenantId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;
  updatePaymentStatus(id: number, status: string): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<void>;
  
  // Maintenance methods
  getMaintenanceReport(id: number): Promise<MaintenanceReport | undefined>;
  getMaintenanceReportsByTenantId(tenantId: number): Promise<MaintenanceReport[]>;
  getAllMaintenanceReports(): Promise<MaintenanceReport[]>;
  createMaintenanceReport(report: InsertMaintenanceReport): Promise<MaintenanceReport>;
  updateMaintenanceReport(id: number, report: Partial<MaintenanceReport>): Promise<MaintenanceReport | undefined>;
  updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceReport | undefined>;
  deleteMaintenanceReport(id: number): Promise<void>;
  
  // Kasunduan methods
  getKasunduanByTenantId(tenantId: number): Promise<Kasunduan | undefined>;
  createKasunduan(kasunduanData: InsertKasunduan): Promise<Kasunduan>;
  updateKasunduan(id: number, accepted: boolean): Promise<Kasunduan | undefined>;
  
  // Unit methods
  getUnit(id: number): Promise<Unit | undefined>;
  getUnitByUnitId(unitId: string): Promise<Unit | undefined>;
  getAllUnits(): Promise<Unit[]>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnitStatus(unitId: string, status: string): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<void>;

  // Settings methods
  getSetting(key: string): Promise<Settings | undefined>;
  getAllSettings(): Promise<Settings[]>;
  upsertSetting(key: string, value: string): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Tenant methods
  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantByUserId(userId: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.userId, userId));
    return tenant || undefined;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.id));
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async updateTenant(id: number, tenantData: Partial<Tenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set(tenantData)
      .where(eq(tenants.id, id))
      .returning();
    return tenant || undefined;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  // Payment methods
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByTenantId(tenantId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.dateUploaded));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.dateUploaded));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set(paymentData)
      .where(eq(payments.id, id))
      .returning();
    return payment || undefined;
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set({ status })
      .where(eq(payments.id, id))
      .returning();
    return payment || undefined;
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // Maintenance methods
  async getMaintenanceReport(id: number): Promise<MaintenanceReport | undefined> {
    const [report] = await db.select().from(maintenanceReports).where(eq(maintenanceReports.id, id));
    return report || undefined;
  }

  async getMaintenanceReportsByTenantId(tenantId: number): Promise<MaintenanceReport[]> {
    return await db
      .select()
      .from(maintenanceReports)
      .where(eq(maintenanceReports.tenantId, tenantId))
      .orderBy(desc(maintenanceReports.dateReported));
  }

  async getAllMaintenanceReports(): Promise<MaintenanceReport[]> {
    return await db.select().from(maintenanceReports).orderBy(desc(maintenanceReports.dateReported));
  }

  async createMaintenanceReport(insertReport: InsertMaintenanceReport): Promise<MaintenanceReport> {
    const [report] = await db.insert(maintenanceReports).values(insertReport).returning();
    return report;
  }

  async updateMaintenanceReport(id: number, reportData: Partial<MaintenanceReport>): Promise<MaintenanceReport | undefined> {
    const [report] = await db
      .update(maintenanceReports)
      .set(reportData)
      .where(eq(maintenanceReports.id, id))
      .returning();
    return report || undefined;
  }

  async updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceReport | undefined> {
    const [report] = await db
      .update(maintenanceReports)
      .set({ status })
      .where(eq(maintenanceReports.id, id))
      .returning();
    return report || undefined;
  }

  async deleteMaintenanceReport(id: number): Promise<void> {
    await db.delete(maintenanceReports).where(eq(maintenanceReports.id, id));
  }

  // Kasunduan methods
  async getKasunduanByTenantId(tenantId: number): Promise<Kasunduan | undefined> {
    const [kasunduanRecord] = await db.select().from(kasunduan).where(eq(kasunduan.tenantId, tenantId));
    return kasunduanRecord || undefined;
  }

  async createKasunduan(insertKasunduan: InsertKasunduan): Promise<Kasunduan> {
    const [kasunduanRecord] = await db.insert(kasunduan).values(insertKasunduan).returning();
    return kasunduanRecord;
  }

  async updateKasunduan(id: number, accepted: boolean): Promise<Kasunduan | undefined> {
    const [kasunduanRecord] = await db
      .update(kasunduan)
      .set({ accepted, dateAccepted: new Date() })
      .where(eq(kasunduan.id, id))
      .returning();
    return kasunduanRecord || undefined;
  }

  // Unit methods
  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async getUnitByUnitId(unitId: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.unitId, unitId));
    return unit || undefined;
  }

  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units).orderBy(units.unitId);
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const [unit] = await db.insert(units).values(insertUnit).returning();
    return unit;
  }

  async updateUnitStatus(unitId: string, status: string): Promise<Unit | undefined> {
    const [unit] = await db
      .update(units)
      .set({ status })
      .where(eq(units.unitId, unitId))
      .returning();
    return unit || undefined;
  }

  async deleteUnit(id: number): Promise<void> {
    await db.delete(units).where(eq(units.id, id));
  }
  
  // Settings methods
  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async getAllSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async upsertSetting(key: string, value: string): Promise<Settings> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
