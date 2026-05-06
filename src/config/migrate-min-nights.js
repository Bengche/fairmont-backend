import pool from "./db.js";

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1`,
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS seasonal_min_nights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        min_nights INTEGER NOT NULL DEFAULT 2,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query("COMMIT");
    console.log("✓ seasonal_min_nights migration complete");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
};

migrate();
