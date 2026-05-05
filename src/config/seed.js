import pool from "./db.js";
import bcrypt from "bcryptjs";

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Site config — bank details as single source of truth in DB
    await client.query(`
      INSERT INTO site_config (key, value) VALUES
        ('bank_name', 'Royal Bank of Canada (RBC)'),
        ('bank_account_name', 'Fairmont Château Laurier Inc.'),
        ('bank_account_number', '0042-1234567'),
        ('bank_routing_number', '003000420'),
        ('bank_swift', 'ROYCCAT2'),
        ('bank_iban', 'CA00ROYC00300042123456'),
        ('bank_instructions', 'Please include your Booking Reference Number as the payment reference. Transfers typically take 1–2 business days.')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Admin user
    const adminHash = await bcrypt.hash("Admin@Fairmont2026", 12);
    await client.query(
      `
      INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified)
      VALUES ('Admin', 'Fairmont', 'admin@fifahotel.com', $1, 'admin', true)
      ON CONFLICT (email) DO NOTHING;
    `,
      [adminHash],
    );

    // Room categories
    await client.query(`
      INSERT INTO room_categories (name, slug, description, display_order) VALUES
        ('Classic Room', 'classic', 'Elegantly appointed rooms with timeless décor and modern amenities.', 1),
        ('Deluxe Room', 'deluxe', 'Spacious rooms with premium furnishings and enhanced views.', 2),
        ('Junior Suite', 'junior-suite', 'Generous suites with a separate living area and luxurious appointments.', 3),
        ('Grand Suite', 'grand-suite', 'Expansive suites offering the pinnacle of castle-inspired luxury.', 4),
        ('Presidential Suite', 'presidential-suite', 'Our most exclusive offering — a masterpiece of space, elegance and service.', 5)
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Fetch category IDs
    const { rows: cats } = await client.query(
      "SELECT id, slug FROM room_categories",
    );
    const catMap = {};
    cats.forEach((c) => {
      catMap[c.slug] = c.id;
    });

    // Rooms
    const rooms = [
      {
        category_slug: "classic",
        name: "Classic Heritage Room",
        slug: "classic-heritage-room",
        short_description:
          "A refined retreat with castle views and heritage furnishings.",
        description:
          "Steeped in the history of Fairmont Château Laurier, the Classic Heritage Room offers a serene escape with hand-crafted furnishings, plush bedding and refined details at every turn. City or courtyard views frame your stay within the heart of Ottawa.",
        price_per_night: 389,
        max_occupancy: 2,
        adults: 2,
        children: 0,
        size_sqft: 320,
        floor_level: "Floors 3–7",
        view_type: "City or Courtyard View",
        bed_type: "King or Two Doubles",
        bathroom_type:
          "Marble bathroom with deep soaking tub and separate rain shower",
        features: [
          "320 sq ft",
          "King or Two Doubles",
          "City or Courtyard View",
          "Marble Bathroom",
          "Soaking Tub",
          "Rain Shower",
          '55" 4K Smart TV',
          "Mini Bar",
          "In-room Safe",
          "Pillow Menu",
          "Turndown Service",
          "Complimentary Wi-Fi",
          "Air Conditioning",
          "Robes & Slippers",
          "Room Service",
        ],
        amenities: [
          '55" 4K Smart TV',
          "Mini Bar",
          "Safe",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
          "Pillow Menu",
          "Room Service 24/7",
          "Daily Newspaper",
        ],
        images: [
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=85&fit=crop",
        ],
        is_featured: true,
      },
      {
        category_slug: "classic",
        name: "Classic Canal View Room",
        slug: "classic-canal-view-room",
        short_description:
          "Wake to panoramic views of the UNESCO-listed Rideau Canal.",
        description:
          "Positioned to capture the timeless beauty of the Rideau Canal, this room pairs heritage interiors with sweeping waterway views. The Rideau Canal, a UNESCO World Heritage Site, provides a living canvas that changes with every season.",
        price_per_night: 429,
        max_occupancy: 2,
        adults: 2,
        children: 0,
        size_sqft: 330,
        floor_level: "Floors 5–8",
        view_type: "Rideau Canal View",
        bed_type: "King",
        bathroom_type: "Marble bathroom with soaking tub and walk-in shower",
        features: [
          "330 sq ft",
          "King Bed",
          "Rideau Canal View",
          "Marble Bathroom",
          "Soaking Tub",
          "Walk-in Shower",
          '55" 4K Smart TV',
          "Mini Bar",
          "Safe",
          "Pillow Menu",
          "Turndown Service",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
        ],
        amenities: [
          '55" 4K Smart TV',
          "Mini Bar",
          "Safe",
          "Complimentary Wi-Fi",
          "Pillow Menu",
          "Robes & Slippers",
          "Room Service 24/7",
        ],
        images: [
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1560347876-aeef00ee58a1?w=1200&q=85&fit=crop",
        ],
        is_featured: false,
      },
      {
        category_slug: "deluxe",
        name: "Deluxe Parliament View Room",
        slug: "deluxe-parliament-view-room",
        short_description:
          "Iconic views of Parliament Hill from a superbly appointed deluxe room.",
        description:
          "Few hotel rooms in Canada command views as iconic as this. The Deluxe Parliament View Room faces Ottawa's Parliament Hill directly, offering a dramatic backdrop to your stay. Upgraded furnishings, premium linens, and enhanced amenities elevate the experience.",
        price_per_night: 519,
        max_occupancy: 2,
        adults: 2,
        children: 0,
        size_sqft: 380,
        floor_level: "Floors 6–10",
        view_type: "Parliament Hill View",
        bed_type: "King",
        bathroom_type:
          "Italian marble bathroom with dual vanity, deep soaking tub and separate rain shower",
        features: [
          "380 sq ft",
          "King Bed",
          "Parliament Hill View",
          "Italian Marble Bathroom",
          "Dual Vanity",
          "Soaking Tub",
          "Rain Shower",
          '65" 4K Smart TV',
          "Mini Bar",
          "Safe",
          "Nespresso Machine",
          "Pillow Menu",
          "Evening Turndown",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
          "Room Service 24/7",
        ],
        amenities: [
          '65" 4K Smart TV',
          "Mini Bar",
          "Nespresso Machine",
          "Safe",
          "Complimentary Wi-Fi",
          "Pillow Menu",
          "Robes & Slippers",
          "Turndown Service",
          "Room Service 24/7",
        ],
        images: [
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=85&fit=crop",
        ],
        is_featured: true,
      },
      {
        category_slug: "deluxe",
        name: "Deluxe Fairmont Room",
        slug: "deluxe-fairmont-room",
        short_description:
          "Our signature Deluxe offering with enhanced space and premium comforts.",
        description:
          "The Deluxe Fairmont Room represents the quintessential château experience — spacious, beautifully appointed, and finished with the hallmark details that define the Fairmont standard. Enhanced square footage allows for a more generous layout and gracious living space.",
        price_per_night: 479,
        max_occupancy: 3,
        adults: 2,
        children: 1,
        size_sqft: 420,
        floor_level: "Floors 4–9",
        view_type: "City View",
        bed_type: "King or Two Queens",
        bathroom_type:
          "Marble bathroom with soaking tub and stand-alone shower",
        features: [
          "420 sq ft",
          "King or Two Queens",
          "City View",
          "Marble Bathroom",
          "Soaking Tub",
          "Stand-alone Shower",
          '65" 4K Smart TV',
          "Mini Bar",
          "Safe",
          "Pillow Menu",
          "Nespresso Machine",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
          "Room Service 24/7",
        ],
        amenities: [
          '65" 4K Smart TV',
          "Mini Bar",
          "Safe",
          "Nespresso Machine",
          "Complimentary Wi-Fi",
          "Pillow Menu",
          "Robes & Slippers",
          "Turndown Service",
          "Room Service 24/7",
        ],
        images: [
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=85&fit=crop",
        ],
        is_featured: false,
      },
      {
        category_slug: "junior-suite",
        name: "Junior Suite",
        slug: "junior-suite",
        short_description:
          "A well-proportioned suite with a defined living area and signature Fairmont service.",
        description:
          "The Junior Suite offers a harmonious blend of bedroom and living space, providing guests with room to relax and recharge in true luxury. Rich draperies, bespoke furniture pieces and meticulous craftsmanship define the character of these spacious retreats.",
        price_per_night: 749,
        max_occupancy: 3,
        adults: 2,
        children: 1,
        size_sqft: 620,
        floor_level: "Floors 5–9",
        view_type: "City or Canal View",
        bed_type: "King",
        bathroom_type:
          "Luxury marble bathroom with dual vanity, deep soaking tub, walk-in rain shower and heated floors",
        features: [
          "620 sq ft",
          "King Bed",
          "Separate Living Area",
          "City or Canal View",
          "Heated Marble Floors",
          "Dual Vanity",
          "Deep Soaking Tub",
          "Walk-in Rain Shower",
          '75" 4K Smart TV (x2)',
          "Wet Bar",
          "Mini Bar",
          "Nespresso Machine",
          "Safe",
          "Pillow Menu",
          "Evening Turndown",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
          "Room Service 24/7",
          "Enhanced Minibar",
        ],
        amenities: [
          '75" 4K Smart TV x2',
          "Wet Bar",
          "Mini Bar",
          "Nespresso Machine",
          "Safe",
          "Complimentary Wi-Fi",
          "Pillow Menu",
          "Robes & Slippers",
          "Butler Service",
          "Turndown Service",
          "Room Service 24/7",
          "Heated Floors",
        ],
        images: [
          "https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=1200&q=85&fit=crop",
        ],
        is_featured: true,
      },
      {
        category_slug: "grand-suite",
        name: "Grand Fairmont Suite",
        slug: "grand-fairmont-suite",
        short_description:
          "The Grand Fairmont Suite — an incomparable standard in castle luxury.",
        description:
          "Every aspect of the Grand Fairmont Suite has been conceived with reverence for the château's storied past and an unwavering commitment to contemporary luxury. A full living room, private dining area, and master bedroom form a self-contained world of refinement within Ottawa's most celebrated building.",
        price_per_night: 1250,
        max_occupancy: 4,
        adults: 3,
        children: 1,
        size_sqft: 1100,
        floor_level: "Floors 8–11",
        view_type: "Parliament Hill and Canal Panoramic View",
        bed_type: "King",
        bathroom_type:
          "Two full marble bathrooms, master bath with freestanding soaking tub, dual rain showers and heated floors",
        features: [
          "1,100 sq ft",
          "King Bed",
          "Full Living Room",
          "Private Dining Area",
          "Parliament & Canal Views",
          "2 Full Marble Bathrooms",
          "Freestanding Soaking Tub",
          "Dual Rain Showers",
          "Heated Floors",
          '85" 4K Smart TV (x3)',
          "Full Wet Bar",
          "Nespresso Premium Machine",
          "In-suite Dining",
          "Safe",
          "Pillow Menu",
          "Butler Service",
          "Evening Turndown",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
          "Room Service 24/7",
        ],
        amenities: [
          '85" 4K Smart TV x3',
          "Full Wet Bar",
          "In-suite Dining",
          "Nespresso Premium",
          "Dedicated Butler",
          "Pillow Menu",
          "Robes & Slippers",
          "Heated Floors",
          "Twice-daily Housekeeping",
          "Room Service 24/7",
        ],
        images: [
          "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=1200&q=85&fit=crop",
        ],
        is_featured: true,
      },
      {
        category_slug: "presidential-suite",
        name: "Presidential Suite",
        slug: "presidential-suite",
        short_description:
          "Ottawa's most prestigious address — an entire floor of unparalleled grandeur.",
        description:
          "The Presidential Suite at Fairmont Château Laurier is not merely a room — it is an event. Occupying a commanding position within the château, this masterpiece of design and hospitality has hosted heads of state, royalty, and the world's most discerning guests. Three bedrooms, a grand reception room, a private library, and sweeping panoramic views of Parliament Hill, the Rideau Canal and the Ottawa River define this extraordinary residence.",
        price_per_night: 4500,
        max_occupancy: 6,
        adults: 4,
        children: 2,
        size_sqft: 3200,
        floor_level: "Top Floor",
        view_type:
          "360° Panoramic — Parliament Hill, Rideau Canal, Ottawa River",
        bed_type: "Three King Bedrooms",
        bathroom_type:
          "Three full luxury marble bathrooms, master bath with two freestanding soaking tubs, his-and-hers rain showers, and heated stone floors",
        features: [
          "3,200 sq ft",
          "Three King Bedrooms",
          "Grand Reception Room",
          "Private Library",
          "Private Dining Room (seats 12)",
          "360° Panoramic Views",
          "3 Luxury Marble Bathrooms",
          "Two Freestanding Soaking Tubs",
          "His & Hers Rain Showers",
          "Heated Stone Floors",
          '85" 4K Smart TV (x5)',
          "Grand Piano",
          "Full Kitchen",
          "Wine Cellar",
          "Dedicated Butler Team",
          "Private Check-in",
          "Airport Transfer Included",
          "Pillow Menu",
          "Evening Turndown",
          "Complimentary Wi-Fi",
          "Robes & Slippers",
          "Room Service 24/7",
        ],
        amenities: [
          "Grand Piano",
          "Full Kitchen",
          "Wine Cellar",
          "Dedicated Butler Team",
          "Private Check-in",
          "Airport Transfer",
          '85" 4K Smart TV x5',
          "In-suite Dining",
          "Nespresso Premium Bar",
          "Heated Stone Floors",
          "24/7 Personal Concierge",
          "Private Library",
        ],
        images: [
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85&fit=crop",
          "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=85&fit=crop",
        ],
        is_featured: true,
      },
    ];

    for (const r of rooms) {
      await client.query(
        `
        INSERT INTO rooms (
          category_id, name, slug, description, short_description,
          price_per_night, max_occupancy, adults, children,
          size_sqft, floor_level, view_type, bed_type, bathroom_type,
          features, amenities, images, is_featured, display_order
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
        ) ON CONFLICT (slug) DO UPDATE SET
          features = EXCLUDED.features,
          amenities = EXCLUDED.amenities,
          images = EXCLUDED.images,
          price_per_night = EXCLUDED.price_per_night,
          description = EXCLUDED.description,
          short_description = EXCLUDED.short_description,
          display_order = EXCLUDED.display_order,
          is_featured = EXCLUDED.is_featured;
      `,
        [
          catMap[r.category_slug],
          r.name,
          r.slug,
          r.description,
          r.short_description,
          r.price_per_night,
          r.max_occupancy,
          r.adults,
          r.children,
          r.size_sqft,
          r.floor_level,
          r.view_type,
          r.bed_type,
          r.bathroom_type,
          JSON.stringify(r.features),
          JSON.stringify(r.amenities),
          JSON.stringify(r.images),
          r.is_featured,
          rooms.indexOf(r) + 1,
        ],
      );
    }

    // Offers
    await client.query(`
      INSERT INTO offers (title, slug, description, short_description, promo_code, discount_type, discount_value, valid_from, valid_until, image_url, is_active, display_order)
      VALUES
        ('World Cup Luxury Package', 'world-cup-package', 'Celebrate the beautiful game in style. Our World Cup Luxury Package includes three nights in a Deluxe Room, daily breakfast for two, a curated match-viewing experience in our private lounge, and a welcome amenity upon arrival.', 'Three nights, breakfast for two, private match viewing.', 'WORLDCUP2026', 'percentage', 15, '2026-05-01', '2026-12-31', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=85&fit=crop', true, 1),
        ('Bed & Breakfast Retreat', 'bed-and-breakfast', 'Begin each morning with a full gourmet breakfast at Wilfreds Restaurant, served amid the grandeur of the château''s dining room. Available with any room category.', 'Room + daily gourmet breakfast for two.', 'BBFAIRMONT', 'fixed', 65, '2026-01-01', '2026-12-31', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=900&q=85&fit=crop', true, 2),
        ('Romance in the Château', 'romance-package', 'Arrive to a room dressed with rose petals, Veuve Clicquot Champagne, and hand-selected confections. Includes a couples spa treatment and a candlelit dinner reservation at Wilfreds.', 'Champagne, roses, couples spa, and dinner.', 'ROMANCE', 'fixed', 0, '2026-01-01', '2026-12-31', 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=900&q=85&fit=crop', true, 3),
        ('The Long Weekend Escape', 'long-weekend', 'Stay three or more nights and receive a 20% reduction across all room categories. Ideal for extended discovery of Ottawa and the surrounding National Capital Region.', '20% off for stays of 3 nights or more.', 'LONGWEEKEND', 'percentage', 20, '2026-01-01', '2026-12-31', 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=900&q=85&fit=crop', true, 4)
      ON CONFLICT (slug) DO UPDATE SET image_url = EXCLUDED.image_url;
    `);

    // Blog posts
    await client
      .query(
        `
      SELECT id FROM users WHERE email = 'admin@fifahotel.com' LIMIT 1
    `,
      )
      .then(async ({ rows }) => {
        if (rows.length) {
          const authorId = rows[0].id;
          await client.query(
            `
          INSERT INTO blog_posts (title, slug, excerpt, body, author_id, category, tags, cover_image, is_published, published_at)
          VALUES
            ('Ottawa in Spring: What to See and Do Near the Château', 'ottawa-spring-guide-2026', 'Spring in Ottawa is a celebration of colour, culture, and renewal. From the world-famous Canadian Tulip Festival to the awakening Rideau Canal, the city offers an unrivalled backdrop for a luxury getaway.', '<p>Spring in Ottawa...</p>', $1, 'Travel Guides', '["Ottawa","Spring","Travel","Tulip Festival"]', 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=1200&q=85&fit=crop', true, NOW()),
            ('A History of Fairmont Château Laurier: 114 Years of Excellence', 'chateau-laurier-history', 'Since opening its doors on June 12, 1912, Fairmont Château Laurier has stood as a beacon of hospitality in Canada''s capital. From royal visits to historic summits, its walls carry the weight of a nation''s memory.', '<p>The château''s story begins...</p>', $1, 'Hotel News', '["History","Château","Heritage","Ottawa"]', 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=1200&q=85&fit=crop', true, NOW()),
            ('The 2026 FIFA World Cup: Canada''s Once-in-a-Generation Moment', 'fifa-world-cup-2026-canada', 'With Canada co-hosting the 2026 FIFA World Cup alongside the United States and Mexico, Ottawa has become one of the most sought-after destinations for football fans from around the world. Here is how Fairmont Château Laurier is celebrating.', '<p>The World Cup arrives...</p>', $1, 'Hotel News', '["World Cup","Football","FIFA 2026","Events"]', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=85&fit=crop', true, NOW())
          ON CONFLICT (slug) DO UPDATE SET cover_image = EXCLUDED.cover_image;
        `,
            [authorId],
          );
        }
      });

    // Approved reviews
    await client.query(`
      INSERT INTO reviews (guest_name, rating, title, body, is_approved)
      VALUES
        ('James & Catherine H.', 5, 'The finest hotel experience of our lives', 'From the moment we arrived, every detail was attended to with a grace and professionalism that is vanishingly rare. The Grand Fairmont Suite exceeded every expectation. Ottawa is the better for having this extraordinary property.', true),
        ('Ambassador R. Dupont', 5, 'Unrivalled in elegance and service', 'I have stayed in the world''s greatest hotels over four decades of diplomatic service. Fairmont Château Laurier remains, without qualification, among the very finest. The attentiveness of staff and the beauty of the property are simply extraordinary.', true),
        ('Dr. Priya Mehta', 5, 'A perfect setting for our anniversary', 'We chose the Romance Package for our tenth anniversary and were moved by the care taken with every element — the flowers, the champagne, the dinner. The staff made us feel like the only guests in the hotel.', true),
        ('Marcus T.', 5, 'The Parliament View room was breathtaking', 'Waking up to a direct view of Parliament Hill from bed is something I will not forget. The room was immaculate, the breakfast at Wilfreds was superb, and the concierge found us theatre tickets at the last minute. Impeccable.', true),
        ('The Chen Family', 5, 'We will return every year', 'Travelling with children can be challenging, but the team here managed to make every member of our family feel at home. The pool, the dining, the rooms — everything is at the absolute peak of quality.', true)
      ON CONFLICT DO NOTHING;
    `);

    await client.query("COMMIT");
    console.log("Seed completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
