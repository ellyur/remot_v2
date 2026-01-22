import { sql } from 'drizzle-orm';
import { db } from './db';

async function initDatabase() {
  try {
    console.log('Checking database connection...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      );
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
      );
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
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS maintenance_reports (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        image_path TEXT,
        date_reported TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending'
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kasunduan (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        accepted BOOLEAN NOT NULL DEFAULT false,
        date_accepted TIMESTAMP
      );
    `);
    
    console.log('Database tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
