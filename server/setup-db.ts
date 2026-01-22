import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import bcrypt from 'bcryptjs';

neonConfig.webSocketConstructor = ws;

async function setupDatabase() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('Please ensure the database is provisioned in Replit.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    console.log('Connected to database successfully!');
    console.log('Dropping existing tables...');
    
    // Drop all tables in reverse order of dependencies
    await db.execute(sql`DROP TABLE IF EXISTS kasunduan CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS maintenance_reports CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS payments CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS tenants CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    
    console.log('Creating tables...');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);
    
    // Create tenants table
    await db.execute(sql`
      CREATE TABLE tenants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        occupation TEXT,
        rent_amount DECIMAL(10, 2) NOT NULL,
        emergency_contact TEXT
      )
    `);
    
    // Create payments table
    await db.execute(sql`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        month TEXT NOT NULL,
        date_uploaded TIMESTAMP NOT NULL DEFAULT NOW(),
        image_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE maintenance_reports (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        image_path TEXT,
        date_reported TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending'
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE kasunduan (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        accepted BOOLEAN NOT NULL DEFAULT false,
        date_accepted TIMESTAMP
      )
    `);
    
    console.log('✓ Tables created successfully!');
    
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.execute(sql`
      INSERT INTO users (username, password, role)
      VALUES ('admin', ${hashedPassword}, 'admin')
    `);
    
    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('========================================');
    console.log('DATABASE SETUP COMPLETE!');
    console.log('========================================');
    console.log('Admin Credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('========================================');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
