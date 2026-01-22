import { sql } from 'drizzle-orm';
import { db } from './db';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create tables (IF NOT EXISTS for safety)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tenants (
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
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payments (
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
      CREATE TABLE IF NOT EXISTS maintenance_reports (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        image_path TEXT,
        date_reported TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending'
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kasunduan (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        accepted BOOLEAN NOT NULL DEFAULT false,
        date_accepted TIMESTAMP
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('✓ Database tables ready');
    
    // Check if admin user exists
    const result = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM users WHERE username = 'admin'
    `);
    
    const adminExists = result.rows[0]?.count > 0;
    
    if (!adminExists) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.execute(sql`
        INSERT INTO users (username, password, role)
        VALUES ('admin', ${hashedPassword}, 'admin')
      `);
      
      console.log('✓ Admin user created (username: admin, password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
