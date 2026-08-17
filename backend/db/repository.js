const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

// ─── Local store (memória/JSON) ──────────────────────────────────────────
function loadLocalDB() {
  let data = { users: [], cards: [], contacts: [], support_tickets: [], admin_messages: [], _counters: { users: 0, cards: 0, contacts: 0, support_tickets: 0, admin_messages: 0 } };
  try {
    if (fs.existsSync(DB_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      data = { ...data, ...parsed };
    }
  } catch (e) {
    console.error('Erro ao carregar DB local:', e.message);
  }
  if (!data.users) data.users = [];
  if (!data.cards) data.cards = [];
  if (!data.contacts) data.contacts = [];
  if (!data.support_tickets) data.support_tickets = [];
  if (!data.admin_messages) data.admin_messages = [];
  if (!data._counters) data._counters = {};
  if (!data._counters.users) data._counters.users = 0;
  if (!data._counters.cards) data._counters.cards = 0;
  if (!data._counters.contacts) data._counters.contacts = 0;
  if (!data._counters.support_tickets) data._counters.support_tickets = 0;
  if (!data._counters.admin_messages) data._counters.admin_messages = 0;
  return data;
}

function saveLocalDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar DB local:', e.message);
  }
}

const db = loadLocalDB();

// Privilégios administrativos são persistidos no banco e nunca inferidos pelo e-mail.

function nextId(collection) {
  db._counters[collection] = (db._counters[collection] || 0) + 1;
  return db._counters[collection];
}

function normalizeCard(row) {
  const products = typeof row.products === 'string' ? JSON.parse(row.products) : (row.products || []);
  return {
    ...row,
    products,
    services_mode: row.services_mode || (products.length ? 'list' : 'image'),
    services_title: row.services_title || '',
    services_image_url: row.services_image_url || '',
    gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery) : (row.gallery || []),
    testimonials: typeof row.testimonials === 'string' ? JSON.parse(row.testimonials) : (row.testimonials || []),
  };
}

function castUserRow(row) {
  if (!row) return null;
  const isAdmin = !!row.is_admin;
  const legacyPlan = row.plan || (isAdmin ? 'none' : 'inactive');
  const plan = isAdmin ? 'none' : (legacyPlan === 'free' ? 'inactive' : legacyPlan);
  const legacyActive = !isAdmin && legacyPlan === 'pro';
  return {
    ...row,
    is_admin: isAdmin,
    plan,
    account_status: row.account_status || (isAdmin ? 'active' : (legacyActive ? 'active' : 'inactive')),
    subscription_status: row.subscription_status || (isAdmin ? 'none' : (legacyActive ? 'active' : 'inactive')),
    subscription_source: row.subscription_source || (isAdmin ? 'none' : (legacyActive ? 'legacy' : 'none')),
    subscription_plan: row.subscription_plan || null,
    subscription_amount: row.subscription_amount || null,
    subscription_reference: row.subscription_reference || null,
    is_test_account: !!row.is_test_account,
    activation_token_hash: row.activation_token_hash || null,
    activation_expires: row.activation_expires || null,
    email_verified_at: row.email_verified_at || null,
    pending_email: row.pending_email || null,
    email_verification_token_hash: row.email_verification_token_hash || null,
    email_verification_expires: row.email_verification_expires || null,
    subscription_updated_at: row.subscription_updated_at || null,
  };
}

// ─── PostgreSQL (quando DATABASE_URL aponta para um servidor real) ────────
function isPgConfigured() {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

let pgPool = null;
let pgReady = false;
let pgBootstrap = null;

async function initPostgres(pool) {
  await pool.query(`
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
      email_verified_at TIMESTAMP,
      pending_email VARCHAR(255),
      email_verification_token_hash VARCHAR(128),
      email_verification_expires TIMESTAMP,
      subscription_updated_at TIMESTAMP,
      reset_code VARCHAR(6),
      reset_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      slug VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      business VARCHAR(255),
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
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'inactive';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'inactive';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_source VARCHAR(50) DEFAULT 'none';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_reference VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_hash VARCHAR(128);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(128);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(6);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(100);
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS services_mode VARCHAR(20) DEFAULT 'image';
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS services_title VARCHAR(255);
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS services_image_url TEXT;
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS qr_scans_count INTEGER DEFAULT 0;
  `).catch(() => {});

  console.log('✅ PostgreSQL inicializado (repositório)');
}

function ensurePg() {
  if (pgPool) return pgPool;
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || /railway|render|supabase/.test(process.env.DATABASE_URL || '')
      ? { rejectUnauthorized: false }
      : false
  });
  return pgPool;
}

// Resolve o pool apenas depois do bootstrap concluir (decisão única e estável
// por processo: ou PostgreSQL, ou armazenamento local).
async function resolvePool() {
  if (pgBootstrap) await pgBootstrap;
  if (!pgReady) return null;
  return pgPool || ensurePg();
}

function bootstrap() {
  if (!isPgConfigured()) return;
  if (pgBootstrap) return;
  pgBootstrap = (async () => {
    try {
      const pool = ensurePg();
      await initPostgres(pool);
      await pool.query('SELECT 1');
      pgReady = true;
      console.log('✅ Repositório PostgreSQL ativo');
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ ERRO CRÍTICO: PostgreSQL indisponível em produção! Encerrando processo.', e.stack || e);
        process.exit(1);
      } else {
        console.error('⚠️ PostgreSQL indisponível, usando armazenamento local:', e.message);
        pgReady = false;
      }
    }
  })();
}
bootstrap();

// ─── Repositório: users ────────────────────────────────────────────────────
const users = {
  async all() {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM users ORDER BY id ASC');
      return r.rows.map(castUserRow);
    }
    return db.users.slice();
  },
  async findById(id) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return r.rows[0] ? castUserRow(r.rows[0]) : null;
    }
    return castUserRow((db.users || []).find(u => u.id === id) || null);
  },
  async findByLogin(login) {
    const identifier = String(login || '').trim().toLowerCase();
    if (!identifier) return null;
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM users WHERE lower(email) = $1 OR whatsapp = $1 LIMIT 1', [identifier]);
      return r.rows[0] ? castUserRow(r.rows[0]) : null;
    }
    return castUserRow((db.users || []).find(u =>
      (u.email && u.email.toLowerCase() === identifier) || u.whatsapp === identifier
    ) || null);
  },
  async findByEmail(email) {
    const identifier = String(email || '').trim().toLowerCase();
    if (!identifier) return null;
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM users WHERE lower(email) = $1 LIMIT 1', [identifier]);
      return r.rows[0] ? castUserRow(r.rows[0]) : null;
    }
    return castUserRow((db.users || []).find(u => u.email && u.email.toLowerCase() === identifier) || null);
  },
  async findEmailExcluding(email, excludeId) {
    const identifier = String(email || '').trim().toLowerCase();
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM users WHERE (lower(email) = $1 OR lower(pending_email) = $1) AND id <> $2 LIMIT 1', [identifier, excludeId]);
      return r.rows[0] ? castUserRow(r.rows[0]) : null;
    }
    return castUserRow((db.users || []).find(u => u.id !== excludeId && ((u.email && u.email.toLowerCase() === identifier) || (u.pending_email && u.pending_email.toLowerCase() === identifier))) || null);
  },
  async findByPendingEmail(email) {
    const identifier = String(email || '').trim().toLowerCase();
    if (!identifier) return null;
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM users WHERE lower(pending_email) = $1 LIMIT 1', [identifier]);
      return r.rows[0] ? castUserRow(r.rows[0]) : null;
    }
    return castUserRow((db.users || []).find(u => u.pending_email && u.pending_email.toLowerCase() === identifier) || null);
  },
  async insert({
    name, email, whatsapp, password_hash, is_admin = false, plan = 'inactive', referred_by = null,
    account_status = 'inactive', subscription_status = 'inactive', subscription_source = 'none',
    subscription_plan = null, subscription_amount = null, subscription_reference = null, is_test_account = false, activation_token_hash = null,
    activation_expires = null, email_verified_at = null, pending_email = null, email_verification_token_hash = null,
    email_verification_expires = null, subscription_updated_at = null
  }) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO users (
           name, email, whatsapp, password_hash, is_admin, plan, referred_by, account_status,
           subscription_status, subscription_source, subscription_plan, subscription_amount, subscription_reference, is_test_account,
           activation_token_hash, activation_expires, email_verified_at, pending_email, email_verification_token_hash, email_verification_expires, subscription_updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
        [
          name, email, whatsapp || null, password_hash, !!is_admin, plan, referred_by || null, account_status,
          subscription_status, subscription_source, subscription_plan, subscription_amount, subscription_reference, !!is_test_account,
          activation_token_hash, activation_expires, email_verified_at, pending_email, email_verification_token_hash, email_verification_expires, subscription_updated_at
        ]
      );
      return castUserRow(r.rows[0]);
    }
    const user = {
      name,
      email,
      whatsapp: whatsapp || null,
      password_hash,
      is_admin: !!is_admin,
      plan: plan || (is_admin ? 'none' : 'inactive'),
      referred_by: referred_by || null,
      account_status,
      subscription_status,
      subscription_source,
      subscription_plan,
      subscription_amount,
      subscription_reference,
      is_test_account: !!is_test_account,
      activation_token_hash,
      activation_expires,
      email_verified_at,
      pending_email,
      email_verification_token_hash,
      email_verification_expires,
      subscription_updated_at,
      id: nextId('users'),
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    saveLocalDB(db);
    return castUserRow(user);
  },
  async update(id, updates) {
    const pool = await resolvePool();
    if (pool) {
      const fields = [];
      const values = [];
      let i = 1;
      for (const key of ['name', 'email', 'whatsapp', 'password_hash', 'is_admin', 'plan', 'reset_code', 'reset_expires', 'referred_by', 'account_status', 'subscription_status', 'subscription_source', 'subscription_plan', 'subscription_amount', 'subscription_reference', 'is_test_account', 'activation_token_hash', 'activation_expires', 'email_verified_at', 'pending_email', 'email_verification_token_hash', 'email_verification_expires', 'subscription_updated_at']) {
        if (key in updates && updates[key] !== undefined) {
          fields.push(`${key} = $${i++}`);
          values.push(updates[key]);
        }
      }
      if (fields.length) {
        values.push(id);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
      }
      const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return r.rows[0] ? castUserRow(r.rows[0]) : null;
    }
    const idx = (db.users || []).findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(db.users[idx], updates);
    saveLocalDB(db);
    return castUserRow(db.users[idx]);
  },
};

// ─── Repositório: cards ────────────────────────────────────────────────────
const cards = {
  async all() {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM cards ORDER BY id ASC');
      return r.rows.map(normalizeCard);
    }
    return (db.cards || []).slice();
  },
  async findById(id) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM cards WHERE id = $1', [id]);
      return r.rows[0] ? normalizeCard(r.rows[0]) : null;
    }
    return (db.cards || []).find(c => c.id === id) || null;
  },
  async findByIdAndUser(id, userId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM cards WHERE id = $1 AND user_id = $2 LIMIT 1', [id, userId]);
      return r.rows[0] ? normalizeCard(r.rows[0]) : null;
    }
    return (db.cards || []).find(c => c.id === id && c.user_id === userId) || null;
  },
  async findBySlug(slug) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM cards WHERE slug = $1 LIMIT 1', [slug]);
      return r.rows[0] ? normalizeCard(r.rows[0]) : null;
    }
    return (db.cards || []).find(c => c.slug === slug) || null;
  },
  async findBySlugExcluding(slug, excludeId) {
    const pool = await resolvePool();
    if (pool) {
      const r = excludeId
        ? await pool.query('SELECT * FROM cards WHERE slug = $1 AND id <> $2 LIMIT 1', [slug, excludeId])
        : await pool.query('SELECT * FROM cards WHERE slug = $1 LIMIT 1', [slug]);
      return r.rows[0] ? normalizeCard(r.rows[0]) : null;
    }
    return (db.cards || []).find(c => c.slug === slug && c.id !== excludeId) || null;
  },
  async findByUserId(userId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM cards WHERE user_id = $1', [userId]);
      return r.rows.map(normalizeCard);
    }
    return (db.cards || []).filter(c => c.user_id === userId);
  },
  async findOneByUserId(userId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM cards WHERE user_id = $1 LIMIT 1', [userId]);
      return r.rows[0] ? normalizeCard(r.rows[0]) : null;
    }
    return (db.cards || []).find(c => c.user_id === userId) || null;
  },
  async insert(data) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO cards (
           user_id, slug, name, business, title, photo_url, logo_url, description, message,
           phone, email, address, whatsapp, whatsapp_group, instagram, facebook,
           linkedin, tiktok, youtube, twitter, theme, site_button_text, services_mode,
           services_title, services_image_url, products, gallery, testimonials, views_count, qr_scans_count
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
         ) RETURNING *`,
        [
          data.user_id, data.slug, data.name, data.business || null, data.title || null, data.photo_url || null,
          data.logo_url || null, data.description || null, data.message || null, data.phone || null, data.email || null,
          data.address || null, data.whatsapp || null, data.whatsapp_group || null, data.instagram || null,
          data.facebook || null, data.linkedin || null, data.tiktok || null, data.youtube || null, data.twitter || null,
          data.theme || 'midnight', data.site_button_text || null,
          data.services_mode || 'image', data.services_title || null, data.services_image_url || null,
          JSON.stringify(data.products || []), JSON.stringify(data.gallery || []), JSON.stringify(data.testimonials || []),
          data.views_count || 0, data.qr_scans_count || 0
        ]
      );
      return normalizeCard(r.rows[0]);
    }
    const row = {
      ...data,
      id: nextId('cards'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      services_mode: data.services_mode || 'image',
      services_title: data.services_title || '',
      services_image_url: data.services_image_url || '',
      products: data.products || [],
      gallery: data.gallery || [],
      testimonials: data.testimonials || [],
    };
    db.cards.push(row);
    saveLocalDB(db);
    return row;
  },
  async update(id, updates) {
    const pool = await resolvePool();
    if (pool) {
      const fields = [];
      const values = [];
      let i = 1;
      for (const k of ['slug', 'name', 'business', 'title', 'photo_url', 'logo_url', 'description', 'message', 'phone', 'email',
        'address', 'whatsapp', 'whatsapp_group', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'twitter',
        'theme', 'site_button_text', 'services_mode', 'services_title', 'services_image_url',
        'products', 'gallery', 'testimonials', 'views_count', 'qr_scans_count']) {
        if (k in updates && updates[k] !== undefined) {
          const val = ['products', 'gallery', 'testimonials'].includes(k) ? JSON.stringify(updates[k] || []) : updates[k];
          fields.push(`${k} = $${i++}`);
          values.push(val);
        }
      }
      fields.push(`updated_at = $${i++}`);
      values.push(new Date());
      values.push(id);
      await pool.query(`UPDATE cards SET ${fields.join(', ')} WHERE id = $${i}`, values);
      const r = await pool.query('SELECT * FROM cards WHERE id = $1', [id]);
      return r.rows[0] ? normalizeCard(r.rows[0]) : null;
    }
    const idx = (db.cards || []).findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(db.cards[idx], updates, { updated_at: new Date().toISOString() });
    saveLocalDB(db);
    return db.cards[idx];
  },
  async delete(id) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('DELETE FROM cards WHERE id = $1', [id]);
      return (r.rowCount || 0) > 0;
    }
    const idx = (db.cards || []).findIndex(c => c.id === id);
    if (idx === -1) return false;
    db.cards.splice(idx, 1);
    saveLocalDB(db);
    return true;
  },
};

// ─── Repositório: contacts ─────────────────────────────────────────────────
const contacts = {
  async findByCardId(cardId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM contacts WHERE card_id = $1 ORDER BY id ASC', [cardId]);
      return r.rows;
    }
    return (db.contacts || []).filter(c => c.card_id === cardId);
  },
  async all() {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM contacts ORDER BY id ASC');
      return r.rows;
    }
    return (db.contacts || []).slice();
  },
  async insert({ card_id, name, email, phone, message }) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query(
        'INSERT INTO contacts (card_id, name, email, phone, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [card_id, name, email || null, phone || null, message || null]
      );
      return r.rows[0];
    }
    const row = {
      id: nextId('contacts'),
      card_id,
      name,
      email: email || null,
      phone: phone || null,
      message: message || null,
      created_at: new Date().toISOString(),
    };
    db.contacts.push(row);
    saveLocalDB(db);
    return row;
  },
};

// ─── Repositório: support_tickets ──────────────────────────────────────────
const supportTickets = {
  async all() {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM support_tickets ORDER BY id ASC');
      return r.rows;
    }
    return (db.support_tickets || []).slice();
  },
  async findByUserId(userId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY id ASC', [userId]);
      return r.rows;
    }
    return (db.support_tickets || []).filter(t => t.user_id === userId);
  },
  async insert({ user_id, subject, message, status = 'open' }) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query(
        'INSERT INTO support_tickets (user_id, subject, message, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [user_id, subject || null, message, status]
      );
      return r.rows[0];
    }
    const row = {
      id: nextId('support_tickets'),
      user_id,
      subject: subject || null,
      message,
      status,
      created_at: new Date().toISOString(),
    };
    db.support_tickets.push(row);
    saveLocalDB(db);
    return row;
  },
};


// ─── Repositório: admin_messages ───────────────────────────────────────────
const adminMessages = {
  async findByUserId(userId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query('SELECT * FROM admin_messages WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [userId]);
      return r.rows;
    }
    return (db.admin_messages || [])
      .filter(m => m.user_id === userId)
      .slice()
      .sort((a, b) => (b.id || 0) - (a.id || 0));
  },
  async insert({ user_id, subject, message }) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query(
        'INSERT INTO admin_messages (user_id, subject, message) VALUES ($1, $2, $3) RETURNING *',
        [user_id, subject || 'Mensagem do CardLink', message]
      );
      return r.rows[0];
    }
    const row = {
      id: nextId('admin_messages'),
      user_id,
      subject: subject || 'Mensagem do CardLink',
      message,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    db.admin_messages.push(row);
    saveLocalDB(db);
    return row;
  },
  async markRead(id, userId) {
    const pool = await resolvePool();
    if (pool) {
      const r = await pool.query(
        'UPDATE admin_messages SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      return r.rows[0] || null;
    }
    const row = (db.admin_messages || []).find(m => m.id === id && m.user_id === userId);
    if (!row) return null;
    if (!row.read_at) row.read_at = new Date().toISOString();
    saveLocalDB(db);
    return row;
  },
};

module.exports = {
  users,
  cards,
  contacts,
  supportTickets,
  adminMessages,
  db,
  isPgConfigured,
  pgIsReady: () => pgReady,
  async close() {
    if (pgPool) {
      try { await pgPool.end(); } catch (e) { /* ja fechado */ }
      pgPool = null;
      pgReady = false;
    }
  },
};
