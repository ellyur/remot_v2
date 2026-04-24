import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SMSService } from "./services/sms";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertUserSchema, 
  insertTenantSchema, 
  insertPaymentSchema, 
  insertMaintenanceReportSchema, 
  insertUnitSchema,
  type Tenant, 
  type Payment, 
  type MaintenanceReport,
  type Unit
} from "@shared/schema";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Attached assets directory for static files
const attachedAssetsDir = path.join(process.cwd(), "attached_assets");

// Configure multer for file uploads
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  }, (req, res, next) => {
    next();
  });
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    res.sendFile(filePath);
  });

  // Serve attached assets (for GCash QR codes, etc.)
  app.use("/attached_assets", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    const filePath = path.join(attachedAssetsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.role !== role) {
        return res.status(401).json({ message: "Invalid role for this user" });
      }

      let tenant = null;
      let kasunduanAccepted = true;

      if (user.role === "tenant") {
        tenant = await storage.getTenantByUserId(user.id);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant profile not found" });
        }

        const kasunduanRecord = await storage.getKasunduanByTenantId(tenant.id);
        kasunduanAccepted = kasunduanRecord?.accepted || false;
      }

      res.json({ user, tenant, kasunduanAccepted });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  // Tenant Management (Admin only)
  app.get("/api/tenants", async (req, res) => {
    try {
      const tenantsList = await storage.getAllTenants();
      res.json(tenantsList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      const { username, password, fullName, contact, unitId, occupation, rentAmount, emergencyContact } = req.body;

      // Validate user data
      const userData = insertUserSchema.parse({ username, password, role: "tenant" });
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user account
      const user = await storage.createUser({ ...userData, password: hashedPassword });

      // Create tenant profile
      const tenantData = insertTenantSchema.parse({
        userId: user.id,
        fullName,
        contact,
        unitId,
        occupation: occupation || null,
        rentAmount,
        emergencyContact: emergencyContact || null,
      });

      const tenant = await storage.createTenant(tenantData);

      // Mark unit as occupied
      await storage.updateUnitStatus(unitId, "occupied");

      // Create kasunduan record for the tenant
      await storage.createKasunduan({ tenantId: tenant.id, accepted: false });

      res.json({ user, tenant });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create tenant" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { fullName, contact, unitId, occupation, rentAmount, emergencyContact, password } = req.body;

      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (contact) updateData.contact = contact;
      if (unitId) updateData.unitId = unitId;
      if (occupation !== undefined) updateData.occupation = occupation || null;
      if (rentAmount) updateData.rentAmount = rentAmount;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact || null;

      const tenant = await storage.updateTenant(id, updateData);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Update password if provided
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await storage.updateUser(tenant.userId, { password: hashedPassword });
      }

      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const userId = tenant.userId;
      const unitId = tenant.unitId;

      // Delete tenant (cascade will delete related records)
      await storage.deleteTenant(id);
      
      // Delete the associated user account
      await storage.deleteUser(userId);

      // Mark unit as available
      await storage.updateUnitStatus(unitId, "available");
      
      res.json({ message: "Tenant deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unit Management
  app.get("/api/units", async (req, res) => {
    try {
      const unitsList = await storage.getAllUnits();
      res.json(unitsList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const unitData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(unitData);
      res.json(unit);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUnit(id);
      res.json({ message: "Unit deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment Management
  app.get("/api/payments", async (req, res) => {
    try {
      const paymentsList = await storage.getAllPayments();
      
      // Fetch tenant details for each payment
      const paymentsWithTenant = await Promise.all(
        paymentsList.map(async (payment) => {
          const tenant = await storage.getTenant(payment.tenantId);
          return { ...payment, tenant };
        })
      );

      res.json(paymentsWithTenant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tenant/payments", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const paymentsList = await storage.getPaymentsByTenantId(tenant.id);
      res.json(paymentsList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments/upload", upload.single("image"), async (req, res) => {
    try {
      const { tenantId, month, amount } = req.body;

      const paymentData = insertPaymentSchema.parse({
        tenantId: parseInt(tenantId),
        month,
        amount,
        imagePath: req.file ? `uploads/${req.file.filename}` : null,
        status: "pending",
      });

      const payment = await storage.createPayment(paymentData);

      // Send SMS notification to tenant confirming submission
      const tenant = await storage.getTenant(parseInt(tenantId));
      if (tenant && tenant.contact) {
        await SMSService.notifyPaymentSubmission(tenant.contact, tenant.fullName, month, amount);
      }

      // Send SMS notification to admin
      const adminPhoneSetting = await storage.getSetting('admin_phone');
      if (adminPhoneSetting && adminPhoneSetting.value) {
        const adminMessage = `New payment from ${tenant?.fullName} for ${month} (P${amount}). Please verify.`;
        await SMSService.sendAdminNotification(adminPhoneSetting.value, adminMessage);
      }

      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin can create payment directly (mark as paid)
  app.post("/api/payments/create", async (req, res) => {
    try {
      const { tenantId, month, amount } = req.body;

      if (!tenantId || !month || !amount) {
        return res.status(400).json({ message: "Tenant ID, month, and amount are required" });
      }

      const paymentData = insertPaymentSchema.parse({
        tenantId: parseInt(tenantId),
        month,
        amount,
        imagePath: null, // No image for admin-created payments
        status: "verified", // Directly verified when created by admin
      });

      const payment = await storage.createPayment(paymentData);

      // Fetch tenant data to include in response (matching GET /api/payments format)
      const tenant = await storage.getTenant(parseInt(tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Send SMS notification to tenant
      if (tenant.contact) {
        await SMSService.notifyPaymentSubmission(tenant.contact, tenant.fullName, month, amount);
      }

      // Return payment with tenant data to match GET /api/payments format
      res.json({ ...payment, tenant });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { month, amount } = req.body;

      const updateData: any = {};
      if (month) updateData.month = month;
      if (amount) updateData.amount = amount;

      const payment = await storage.updatePayment(id, updateData);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payments/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, rejectionNotes } = req.body;

      if (!["pending", "verified", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      if (status === "rejected" && !rejectionNotes?.trim()) {
        return res.status(400).json({ message: "Rejection notes are required when rejecting a payment" });
      }

      const payment = await storage.updatePaymentStatus(id, status, rejectionNotes);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      // Send SMS notification to tenant when payment is verified
      if (status === "verified") {
        const tenant = await storage.getTenant(payment.tenantId);
        if (tenant && tenant.contact) {
          await SMSService.notifyPaymentVerified(tenant.contact, tenant.fullName, payment.month);
        }
      }

      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePayment(id);
      res.json({ message: "Payment deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Maintenance Management
  app.get("/api/maintenance", async (req, res) => {
    try {
      const reportsList = await storage.getAllMaintenanceReports();
      
      // Fetch tenant details for each report
      const reportsWithTenant = await Promise.all(
        reportsList.map(async (report) => {
          const tenant = await storage.getTenant(report.tenantId);
          return { ...report, tenant };
        })
      );

      res.json(reportsWithTenant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tenant/maintenance", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const reportsList = await storage.getMaintenanceReportsByTenantId(tenant.id);
      res.json(reportsList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance/submit", upload.single("image"), async (req, res) => {
    try {
      const { tenantId, description } = req.body;

      const reportData = insertMaintenanceReportSchema.parse({
        tenantId: parseInt(tenantId),
        description,
        imagePath: req.file ? `uploads/${req.file.filename}` : null,
        status: "pending",
      });

      const report = await storage.createMaintenanceReport(reportData);

      // Send SMS notification to tenant confirming submission
      const tenant = await storage.getTenant(parseInt(tenantId));
      if (tenant && tenant.contact) {
        await SMSService.notifyMaintenanceSubmission(tenant.contact, tenant.fullName);
      }

      // Send SMS notification to admin
      const adminPhoneSetting = await storage.getSetting('admin_phone');
      if (adminPhoneSetting && adminPhoneSetting.value) {
        const adminMessage = `New maintenance report from ${tenant?.fullName}: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`;
        await SMSService.sendAdminNotification(adminPhoneSetting.value, adminMessage);
      }

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/maintenance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { description } = req.body;

      const updateData: any = {};
      if (description) updateData.description = description;

      const report = await storage.updateMaintenanceReport(id, updateData);

      if (!report) {
        return res.status(404).json({ message: "Maintenance report not found" });
      }

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/maintenance/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!["pending", "in progress", "resolved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const report = await storage.updateMaintenanceStatus(id, status);

      if (!report) {
        return res.status(404).json({ message: "Maintenance report not found" });
      }

      // Send SMS notification to tenant when status changes
      const tenant = await storage.getTenant(report.tenantId);
      if (tenant && tenant.contact) {
        await SMSService.notifyMaintenanceUpdate(tenant.contact, tenant.fullName, status);
      }

      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaintenanceReport(id);
      res.json({ message: "Maintenance report deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Kasunduan Management
  app.get("/api/kasunduan/view/:tenantId", async (req, res) => {
    try {
      const tenantId = parseInt(req.params.tenantId);

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }

      const kasunduanRecord = await storage.getKasunduanByTenantId(tenantId);
      const tenant = await storage.getTenant(tenantId);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json({
        kasunduan: kasunduanRecord || null,
        tenant: {
          id: tenant.id,
          fullName: tenant.fullName,
          unitId: tenant.unitId,
          rentAmount: tenant.rentAmount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/kasunduan/accept", async (req, res) => {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }

      let kasunduanRecord = await storage.getKasunduanByTenantId(tenantId);

      if (!kasunduanRecord) {
        kasunduanRecord = await storage.createKasunduan({ tenantId, accepted: true });
      } else {
        kasunduanRecord = await storage.updateKasunduan(kasunduanRecord.id, true);
      }

      res.json(kasunduanRecord);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      const tenantsList = await storage.getAllTenants();
      const paymentsList = await storage.getAllPayments();
      const maintenanceList = await storage.getAllMaintenanceReports();

      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthPayments = paymentsList.filter(p => p.month === currentMonth);

      const stats = {
        totalTenants: tenantsList.length,
        paidRents: currentMonthPayments.filter(p => p.status === "verified").length,
        unpaidRents: currentMonthPayments.filter(p => p.status === "pending").length,
        pendingMaintenance: maintenanceList.filter(r => r.status === "pending").length,
        recentPayments: await Promise.all(
          paymentsList.slice(0, 5).map(async (payment) => {
            const tenant = await storage.getTenant(payment.tenantId);
            return { ...payment, tenant };
          })
        ),
        recentMaintenance: await Promise.all(
          maintenanceList.slice(0, 5).map(async (report) => {
            const tenant = await storage.getTenant(report.tenantId);
            return { ...report, tenant };
          })
        ),
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      // Fetch data with error handling for each query
      let tenantsList: Tenant[] = [];
      let paymentsList: Payment[] = [];
      let maintenanceList: MaintenanceReport[] = [];

      try {
        tenantsList = await storage.getAllTenants() || [];
      } catch (error: any) {
        console.error("Error fetching tenants for analytics:", error);
        tenantsList = [];
      }

      try {
        paymentsList = await storage.getAllPayments() || [];
      } catch (error: any) {
        console.error("Error fetching payments for analytics:", error);
        paymentsList = [];
      }

      try {
        maintenanceList = await storage.getAllMaintenanceReports() || [];
      } catch (error: any) {
        console.error("Error fetching maintenance reports for analytics:", error);
        maintenanceList = [];
      }

      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const currentYear = now.getFullYear();

      // Revenue Analytics
      const verifiedPayments = paymentsList.filter(p => p && p.status === "verified");
      const totalRevenue = verifiedPayments.reduce((sum, p) => {
        const amount = parseFloat(p.amount || "0");
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      // Monthly revenue for last 12 months
      const monthlyRevenue: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        monthlyRevenue[monthKey] = 0;
      }
      
      verifiedPayments.forEach(payment => {
        if (payment && payment.month && monthlyRevenue.hasOwnProperty(payment.month)) {
          const amount = parseFloat(payment.amount || "0");
          if (!isNaN(amount)) {
            monthlyRevenue[payment.month] += amount;
          }
        }
      });

      const revenueData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue,
      }));

      const currentMonthRevenue = monthlyRevenue[currentMonth] || 0;
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
      const lastMonthRevenue = monthlyRevenue[lastMonth] || 0;
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : "0";

      // Late Payers Analysis
      const paymentDueDaySetting = await storage.getSetting('payment_due_day');
      const dueDay = paymentDueDaySetting ? parseInt(paymentDueDaySetting.value) : 1;
      
      const tenantLateCounts: Record<number, { count: number; totalDays: number; tenant: Tenant }> = {};
      
      paymentsList.forEach(payment => {
        if (payment && payment.status === "pending" && payment.month && payment.tenantId) {
          try {
            const [year, month] = payment.month.split("-").map(Number);
            if (isNaN(year) || isNaN(month)) return;
            
            const dueDate = new Date(year, month - 1, dueDay);
            const today = new Date();
            
            if (today > dueDate) {
              const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (!tenantLateCounts[payment.tenantId]) {
                const tenant = tenantsList.find(t => t && t.id === payment.tenantId);
                if (tenant) {
                  tenantLateCounts[payment.tenantId] = {
                    count: 0,
                    totalDays: 0,
                    tenant,
                  };
                }
              }
              
              if (tenantLateCounts[payment.tenantId]) {
                tenantLateCounts[payment.tenantId].count++;
                tenantLateCounts[payment.tenantId].totalDays += daysOverdue;
              }
            }
          } catch (error) {
            console.error("Error processing late payment:", error);
          }
        }
      });

      const latePayers = Object.values(tenantLateCounts)
        .filter(item => item && item.tenant && item.count > 0)
        .map(item => ({
          tenant: item.tenant,
          latePaymentCount: item.count,
          averageDaysOverdue: Math.round(item.totalDays / item.count),
        }))
        .sort((a, b) => b.latePaymentCount - a.latePaymentCount);

      // Maintenance Statistics
      const currentMonthMaintenance = maintenanceList.filter(r => {
        if (!r || !r.dateReported) return false;
        try {
          const reportDate = new Date(r.dateReported);
          return reportDate.toISOString().slice(0, 7) === currentMonth;
        } catch {
          return false;
        }
      });

      const maintenanceByStatus = {
        pending: maintenanceList.filter(r => r && r.status === "pending").length,
        inProgress: maintenanceList.filter(r => r && r.status === "in progress").length,
        resolved: maintenanceList.filter(r => r && r.status === "resolved").length,
      };

      // Maintenance trends (last 6 months)
      const maintenanceTrends: Record<string, { pending: number; inProgress: number; resolved: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        maintenanceTrends[monthKey] = { pending: 0, inProgress: 0, resolved: 0 };
      }

      maintenanceList.forEach(report => {
        if (!report || !report.dateReported) return;
        try {
          const reportMonth = new Date(report.dateReported).toISOString().slice(0, 7);
          if (maintenanceTrends.hasOwnProperty(reportMonth) && report.status) {
            if (report.status === "pending") maintenanceTrends[reportMonth].pending++;
            else if (report.status === "in progress") maintenanceTrends[reportMonth].inProgress++;
            else if (report.status === "resolved") maintenanceTrends[reportMonth].resolved++;
          }
        } catch (error) {
          console.error("Error processing maintenance report:", error);
        }
      });

      const maintenanceData = Object.entries(maintenanceTrends).map(([month, data]) => ({
        month,
        ...data,
      }));

      // Calculate average resolution time (for resolved reports)
      const resolvedReports = maintenanceList.filter(r => r.status === "resolved");
      let totalResolutionDays = 0;
      let resolvedWithDates = 0;
      
      // Note: We don't have a resolved date field, so we'll use dateReported as approximation
      // In a real system, you'd want a dateResolved field

      // Payment Statistics
      const currentMonthPayments = paymentsList.filter(p => p.month === currentMonth);
      const verifiedCurrentMonth = currentMonthPayments.filter(p => p.status === "verified").length;
      const paymentRate = tenantsList.length > 0 
        ? ((verifiedCurrentMonth / tenantsList.length) * 100).toFixed(1)
        : "0";

      const paymentStatusBreakdown = {
        verified: verifiedPayments.length,
        pending: paymentsList.filter(p => p.status === "pending").length,
      };

      // Payment trends (last 6 months)
      const paymentTrends: Record<string, { verified: number; pending: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        paymentTrends[monthKey] = { verified: 0, pending: 0 };
      }

      paymentsList.forEach(payment => {
        if (payment && payment.month && paymentTrends.hasOwnProperty(payment.month)) {
          if (payment.status === "verified") paymentTrends[payment.month].verified++;
          else if (payment.status === "pending") paymentTrends[payment.month].pending++;
        }
      });

      const paymentData = Object.entries(paymentTrends).map(([month, data]) => ({
        month,
        ...data,
      }));

      // Ensure all values are valid numbers and arrays
      const response = {
        revenue: {
          total: isNaN(totalRevenue) ? 0 : totalRevenue,
          currentMonth: isNaN(currentMonthRevenue) ? 0 : currentMonthRevenue,
          growth: isNaN(parseFloat(revenueGrowth)) ? 0 : parseFloat(revenueGrowth),
          trends: Array.isArray(revenueData) ? revenueData : [],
        },
        latePayers: Array.isArray(latePayers) ? latePayers : [],
        maintenance: {
          currentMonth: currentMonthMaintenance.length || 0,
          byStatus: {
            pending: maintenanceByStatus.pending || 0,
            inProgress: maintenanceByStatus.inProgress || 0,
            resolved: maintenanceByStatus.resolved || 0,
          },
          trends: Array.isArray(maintenanceData) ? maintenanceData : [],
        },
        payments: {
          rate: isNaN(parseFloat(paymentRate)) ? 0 : parseFloat(paymentRate),
          statusBreakdown: {
            verified: paymentStatusBreakdown.verified || 0,
            pending: paymentStatusBreakdown.pending || 0,
          },
          trends: Array.isArray(paymentData) ? paymentData : [],
        },
      };

      res.json(response);
    } catch (error: any) {
      console.error("Analytics endpoint error:", error);
      // Return empty but valid structure on error
      res.json({
        revenue: {
          total: 0,
          currentMonth: 0,
          growth: 0,
          trends: [],
        },
        latePayers: [],
        maintenance: {
          currentMonth: 0,
          byStatus: {
            pending: 0,
            inProgress: 0,
            resolved: 0,
          },
          trends: [],
        },
        payments: {
          rate: 0,
          statusBreakdown: {
            verified: 0,
            pending: 0,
          },
          trends: [],
        },
      });
    }
  });

  app.get("/api/tenant/dashboard", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const paymentsList = await storage.getPaymentsByTenantId(tenant.id);
      const maintenanceList = await storage.getMaintenanceReportsByTenantId(tenant.id);

      const stats = {
        totalPayments: paymentsList.length,
        pendingPayments: paymentsList.filter(p => p.status === "pending").length,
        verifiedPayments: paymentsList.filter(p => p.status === "verified").length,
        maintenanceReports: maintenanceList.length,
        recentPayments: paymentsList.slice(0, 5),
        recentMaintenance: maintenanceList.slice(0, 5),
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // SMS Management
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { tenantId, message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const tenant = await storage.getTenant(parseInt(tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (!tenant.contact) {
        return res.status(400).json({ message: "Tenant has no phone number" });
      }

      const result = await SMSService.sendSMS({
        recipients: tenant.contact,
        message,
        senderId: "RentSystem",
      });

      if (result.success) {
        res.json({ message: "SMS sent successfully", data: result.data });
      } else {
        res.status(500).json({ message: "Failed to send SMS", error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test SMS endpoint
  app.post("/api/sms/test", async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const result = await SMSService.sendSMS({
        recipients: phoneNumber,
        message: "This is a test message from RETMOT Rent Payment System. If you received this, SMS is working correctly!",
      });

      if (result.success) {
        res.json({ success: true, message: "Test SMS sent successfully", data: result.data });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test SMS", error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Settings Management
  app.get("/api/settings", async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      // Convert to key-value object
      const settingsObj: Record<string, string> = {};
      allSettings.forEach(s => {
        settingsObj[s.key] = s.value;
      });
      res.json(settingsObj);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { settings: settingsData } = req.body;
      
      if (!settingsData || typeof settingsData !== 'object') {
        return res.status(400).json({ message: "Settings data required" });
      }

      const results = [];
      for (const [key, value] of Object.entries(settingsData)) {
        const setting = await storage.upsertSetting(key, String(value));
        results.push(setting);
      }

      res.json({ message: "Settings saved successfully", settings: results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Overdue payments endpoint
  app.get("/api/payments/overdue", async (req, res) => {
    try {
      const paymentsList = await storage.getAllPayments();
      const tenantsList = await storage.getAllTenants();
      
      const dueDaySetting = await storage.getSetting('payment_due_day');
      const parsedDueDay = dueDaySetting ? parseInt(dueDaySetting.value, 10) : NaN;
      const dueDay = isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 28 ? 5 : parsedDueDay;
      
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonthIndex = today.getMonth();
      const currentMonth = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}`;
      const todayLocal = new Date(currentYear, currentMonthIndex, today.getDate());
      
      // Get all tenants who haven't paid for current month
      const paidTenantIds = new Set(
        paymentsList
          .filter(p => p.month === currentMonth && p.status === 'verified')
          .map(p => p.tenantId)
      );
      
      const overdueList = [];
      
      for (const tenant of tenantsList) {
        if (!paidTenantIds.has(tenant.id)) {
          // Check if payment is overdue (past due day of current month)
          const dueDate = new Date(currentYear, currentMonthIndex, dueDay);
          const isOverdue = todayLocal > dueDate;
          const daysOverdue = isOverdue ? Math.floor((todayLocal.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          
          if (isOverdue) {
            overdueList.push({
              tenant,
              month: currentMonth,
              dueDate: dueDate.toISOString(),
              daysOverdue,
              rentAmount: tenant.rentAmount,
            });
          }
        }
      }
      
      res.json(overdueList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
