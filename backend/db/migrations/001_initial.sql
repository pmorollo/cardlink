CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  whatsapp VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  plan VARCHAR(50) DEFAULT 'inactive',
  account_status VARCHAR(50) DEFAULT 'inactive',
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_source VARCHAR(50) DEFAULT 'none',
  subscription_plan VARCHAR(50),
  subscription_amount VARCHAR(50),
  subscription_reference VARCHAR(255),
  is_test_account BOOLEAN DEFAULT FALSE,
  activation_token_hash VARCHAR(128),
  activation_expires TIMESTAMP,
  trial_ends_at TIMESTAMP,
  email_verified_at TIMESTAMP,
  pending_email VARCHAR(255),
  email_verification_token_hash VARCHAR(128),
  email_verification_expires TIMESTAMP,
  subscription_updated_at TIMESTAMP,
  reset_code VARCHAR(6),
  reset_expires TIMESTAMP,
  reset_attempts INTEGER DEFAULT 0,
  referred_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  business VARCHAR(255),
  business_complement VARCHAR(180),
  title VARCHAR(255),
  photo_url TEXT,
  logo_url TEXT,
  description TEXT,
  message TEXT,
  phone VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  whatsapp VARCHAR(100),
  whatsapp_group TEXT,
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  linkedin VARCHAR(255),
  tiktok VARCHAR(255),
  youtube VARCHAR(255),
  twitter VARCHAR(255),
  theme VARCHAR(50) DEFAULT 'midnight',
  site_button_text VARCHAR(255),
  services_mode VARCHAR(20) DEFAULT 'image',
  services_title VARCHAR(255),
  services_image_url TEXT,
  catalog_pdf_url TEXT,
  catalog_pdf_title VARCHAR(255),
  products JSONB DEFAULT '[]'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  views_count INTEGER DEFAULT 0,
  qr_scans_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
