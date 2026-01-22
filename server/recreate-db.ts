import { sql } from 'drizzle-orm';
import { db, pool } from './db';
import bcrypt from 'bcryptjs';

async function recreateDatabase() {
  try {
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
    
    console.log('Tables created successfully!');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.execute(sql`
      INSERT INTO users (username, password, role)
      VALUES ('admin', ${hashedPassword}, 'admin')
    `);
    
    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error recreating database:', error);
    await pool.end();
    process.exit(1);
  }
}

recreateDatabase();
