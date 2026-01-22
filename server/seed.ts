import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Check if admin already exists
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"));

  if (existingAdmin) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const [admin] = await db
    .insert(users)
    .values({
      username: "admin",
      password: hashedPassword,
      role: "admin",
    })
    .returning();

  console.log("Database seeded successfully!");
  console.log("Admin user created:");
  console.log("  Username: admin");
  console.log("  Password: admin123");
  console.log("\nYou can now login with these credentials.");
}

seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
