import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - for authentication
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin' or 'tenant'
});

// Tenants table - detailed tenant information
export const tenants = pgTable("tenants", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  contact: text("contact").notNull(),
  unitId: text("unit_id").notNull(),
  occupation: text("occupation"),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  emergencyContact: text("emergency_contact"),
});

// Payments table - track payment proofs
export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  month: text("month").notNull(), // e.g., "2025-01" for January 2025
  dateUploaded: timestamp("date_uploaded").notNull().defaultNow(),
  imagePath: text("image_path"),
  status: text("status").notNull().default("pending"), // 'pending', 'verified'
});

// Maintenance Reports table
export const maintenanceReports = pgTable("maintenance_reports", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  imagePath: text("image_path"),
  dateReported: timestamp("date_reported").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // 'pending', 'in progress', 'resolved'
});

// Kasunduan table - track agreement acceptance
export const kasunduan = pgTable("kasunduan", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenants.id, { onDelete: "cascade" }),
  accepted: boolean("accepted").notNull().default(false),
  dateAccepted: timestamp("date_accepted"),
});

// Settings table - landlord/admin settings including GCash info
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.id],
    references: [tenants.userId],
  }),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  user: one(users, {
    fields: [tenants.userId],
    references: [users.id],
  }),
  payments: many(payments),
  maintenanceReports: many(maintenanceReports),
  kasunduan: one(kasunduan, {
    fields: [tenants.id],
    references: [kasunduan.tenantId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
}));

export const maintenanceReportsRelations = relations(maintenanceReports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [maintenanceReports.tenantId],
    references: [tenants.id],
  }),
}));

export const kasunduanRelations = relations(kasunduan, ({ one }) => ({
  tenant: one(tenants, {
    fields: [kasunduan.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "tenant"]),
}).omit({ id: true });

export const insertTenantSchema = createInsertSchema(tenants, {
  fullName: z.string().min(1, "Full name is required"),
  contact: z.string().min(1, "Contact is required"),
  unitId: z.string().min(1, "Unit ID is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
}).omit({ id: true });

export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.string().min(1, "Amount is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
}).omit({ id: true, dateUploaded: true });

export const insertMaintenanceReportSchema = createInsertSchema(maintenanceReports, {
  description: z.string().min(10, "Description must be at least 10 characters"),
}).omit({ id: true, dateReported: true });

export const insertKasunduanSchema = createInsertSchema(kasunduan, {
  accepted: z.boolean(),
}).omit({ id: true, dateAccepted: true });

export const insertSettingsSchema = createInsertSchema(settings, {
  key: z.string().min(1, "Key is required"),
  value: z.string(),
}).omit({ id: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertMaintenanceReport = z.infer<typeof insertMaintenanceReportSchema>;
export type MaintenanceReport = typeof maintenanceReports.$inferSelect;

export type InsertKasunduan = z.infer<typeof insertKasunduanSchema>;
export type Kasunduan = typeof kasunduan.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Extended types for API responses with relations
export type TenantWithUser = Tenant & { user: User };
export type PaymentWithTenant = Payment & { tenant: Tenant };
export type MaintenanceReportWithTenant = MaintenanceReport & { tenant: Tenant };
