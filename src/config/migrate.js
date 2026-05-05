import pool from "./db.js";

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS site_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        phone VARCHAR(30),
        country VARCHAR(100),
        loyalty_number VARCHAR(50),
        loyalty_tier VARCHAR(20) DEFAULT 'silver',
        loyalty_points INTEGER DEFAULT 0,
        role VARCHAR(20) DEFAULT 'guest',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS room_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID REFERENCES room_categories(id),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        short_description VARCHAR(500),
        price_per_night DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'CAD',
        max_occupancy INTEGER NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER DEFAULT 0,
        size_sqft INTEGER,
        floor_level VARCHAR(50),
        view_type VARCHAR(100),
        bed_type VARCHAR(100),
        bathroom_type VARCHAR(200),
        features JSONB,
        amenities JSONB,
        images JSONB,
        is_available BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference_number VARCHAR(30) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        room_id UUID REFERENCES rooms(id),
        guest_first_name VARCHAR(100) NOT NULL,
        guest_last_name VARCHAR(100) NOT NULL,
        guest_email VARCHAR(255) NOT NULL,
        guest_phone VARCHAR(30) NOT NULL,
        guest_country VARCHAR(100),
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        nights INTEGER NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER DEFAULT 0,
        addons JSONB,
        addons_total DECIMAL(10,2) DEFAULT 0,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'CAD',
        special_requests TEXT,
        arrival_time VARCHAR(50),
        promo_code VARCHAR(50),
        discount_amount DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'pending_payment',
        payment_receipt_url TEXT,
        payment_receipt_note TEXT,
        payment_submitted_at TIMESTAMP,
        payment_verified_at TIMESTAMP,
        payment_verified_by UUID REFERENCES users(id),
        cancellation_reason TEXT,
        cancelled_at TIMESTAMP,
        loyalty_points_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS room_availability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES rooms(id),
        date DATE NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        price_override DECIMAL(10,2),
        UNIQUE(room_id, date)
      );

      CREATE TABLE IF NOT EXISTS offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        short_description VARCHAR(500),
        promo_code VARCHAR(50),
        discount_type VARCHAR(20),
        discount_value DECIMAL(10,2),
        valid_from DATE,
        valid_until DATE,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        slug VARCHAR(300) UNIQUE NOT NULL,
        excerpt TEXT,
        body TEXT,
        author_id UUID REFERENCES users(id),
        category VARCHAR(100),
        tags JSONB,
        cover_image TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES bookings(id),
        user_id UUID REFERENCES users(id),
        guest_name VARCHAR(200),
        room_id UUID REFERENCES rooms(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(300),
        body TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS contact_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(30),
        subject VARCHAR(200),
        message TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        is_read BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(guest_email);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
      CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
      CREATE INDEX IF NOT EXISTS idx_rooms_available ON rooms(is_available);
    `);

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
