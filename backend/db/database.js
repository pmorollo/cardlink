const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function loadLocalDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro ao carregar DB local:', e.message);
  }
  return { users: [], cards: [], contacts: [], _counters: { users: 0, cards: 0, contacts: 0 } };
}

function saveLocalDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar DB local:', e.message);
  }
}

const db = loadLocalDB();

// ─── PostgreSQL Integration ───────────────────────────────────────────
const isPostgresConfigured = () => {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
};

let pgPool = null;

if (isPostgresConfigured()) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('railway') || process.env.DATABASE_URL.includes('render')
        ? { rejectUnauthorized: false }
        : false
    });

    initPostgres(pgPool);
  } catch (e) {
    console.error('⚠️ Erro ao inicializar conexão PostgreSQL:', e.message);
  }
}

async function initPostgres(pool) {
  try {
    // 1. Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        whatsapp VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
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
        products JSONB DEFAULT '[]'::jsonb,
        gallery JSONB DEFAULT '[]'::jsonb,
        testimonials JSONB DEFAULT '[]'::jsonb,
        views_count INTEGER DEFAULT 0,
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
    `);

    console.log('✅ Tabelas PostgreSQL verificadas/criadas com sucesso');

    // 2. Check if DB has users
    const resUsers = await pool.query('SELECT * FROM users ORDER BY id ASC');
    const resCards = await pool.query('SELECT * FROM cards ORDER BY id ASC');
    const resContacts = await pool.query('SELECT * FROM contacts ORDER BY id ASC');

    if (resUsers.rows.length === 0 && db.users && db.users.length > 0) {
      console.log('🔄 Migrando dados locais (data.json) para o PostgreSQL...');
      // Migrate users
      for (const u of db.users) {
        await pool.query(
          'INSERT INTO users (id, name, email, whatsapp, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
          [u.id, u.name, u.email || null, u.whatsapp || null, u.password_hash, u.created_at || new Date()]
        );
      }
      // Migrate cards
      for (const c of db.cards) {
        await pool.query(
          `INSERT INTO cards (
            id, user_id, slug, name, business, title, photo_url, description, message,
            phone, email, address, whatsapp, whatsapp_group, instagram, facebook,
            linkedin, tiktok, youtube, twitter, theme, site_button_text, products,
            gallery, testimonials, views_count, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
          ON CONFLICT (id) DO NOTHING`,
          [
            c.id, c.user_id, c.slug, c.name, c.business || null, c.title || null, c.photo_url || null, c.description || null, c.message || null,
            c.phone || null, c.email || null, c.address || null, c.whatsapp || null, c.whatsapp_group || null, c.instagram || null, c.facebook || null,
            c.linkedin || null, c.tiktok || null, c.youtube || null, c.twitter || null, c.theme || 'midnight', c.site_button_text || null,
            JSON.stringify(c.products || []), JSON.stringify(c.gallery || []), JSON.stringify(c.testimonials || []),
            c.views_count || 0, c.created_at || new Date(), c.updated_at || new Date()
          ]
        );
      }
      // Migrate contacts
      for (const ct of db.contacts) {
        await pool.query(
          'INSERT INTO contacts (id, card_id, name, email, phone, message, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [ct.id, ct.card_id, ct.name, ct.email || null, ct.phone || null, ct.message || null, ct.created_at || new Date()]
        );
      }

      // Sync sequences
      await pool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
      await pool.query("SELECT setval('cards_id_seq', (SELECT MAX(id) FROM cards))");
      await pool.query("SELECT setval('contacts_id_seq', (SELECT MAX(id) FROM contacts))");
      console.log('✅ Migração para PostgreSQL concluída com sucesso!');
    }

    // Load fresh data into memory
    const freshUsers = await pool.query('SELECT * FROM users ORDER BY id ASC');
    const freshCards = await pool.query('SELECT * FROM cards ORDER BY id ASC');
    const freshContacts = await pool.query('SELECT * FROM contacts ORDER BY id ASC');

    db.users = freshUsers.rows;
    db.cards = freshCards.rows.map(c => ({
      ...c,
      products: typeof c.products === 'string' ? JSON.parse(c.products) : (c.products || []),
      gallery: typeof c.gallery === 'string' ? JSON.parse(c.gallery) : (c.gallery || []),
      testimonials: typeof c.testimonials === 'string' ? JSON.parse(c.testimonials) : (c.testimonials || []),
    }));
    db.contacts = freshContacts.rows;

    db._counters = {
      users: Math.max(0, ...db.users.map(u => u.id || 0)),
      cards: Math.max(0, ...db.cards.map(c => c.id || 0)),
      contacts: Math.max(0, ...db.contacts.map(ct => ct.id || 0)),
    };
  } catch (e) {
    console.error('❌ Erro na sincronização com PostgreSQL:', e);
  }
}

// ─── Query API ────────────────────────────────────────────────────────
function nextId(collection) {
  db._counters[collection] = (db._counters[collection] || 0) + 1;
  return db._counters[collection];
}

function syncPgInsert(collection, row) {
  if (!pgPool) return;
  if (collection === 'users') {
    pgPool.query(
      'INSERT INTO users (id, name, email, whatsapp, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [row.id, row.name, row.email || null, row.whatsapp || null, row.password_hash, row.created_at]
    ).catch(e => console.error('PG Insert User Error:', e));
  } else if (collection === 'cards') {
    pgPool.query(
      `INSERT INTO cards (
        id, user_id, slug, name, business, title, photo_url, description, message,
        phone, email, address, whatsapp, whatsapp_group, instagram, facebook,
        linkedin, tiktok, youtube, twitter, theme, site_button_text, products,
        gallery, testimonials, views_count, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
      [
        row.id, row.user_id, row.slug, row.name, row.business || null, row.title || null, row.photo_url || null, row.description || null, row.message || null,
        row.phone || null, row.email || null, row.address || null, row.whatsapp || null, row.whatsapp_group || null, row.instagram || null, row.facebook || null,
        row.linkedin || null, row.tiktok || null, row.youtube || null, row.twitter || null, row.theme || 'midnight', row.site_button_text || null,
        JSON.stringify(row.products || []), JSON.stringify(row.gallery || []), JSON.stringify(row.testimonials || []),
        row.views_count || 0, row.created_at, row.updated_at || row.created_at
      ]
    ).catch(e => console.error('PG Insert Card Error:', e));
  } else if (collection === 'contacts') {
    pgPool.query(
      'INSERT INTO contacts (id, card_id, name, email, phone, message, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [row.id, row.card_id, row.name, row.email || null, row.phone || null, row.message || null, row.created_at]
    ).catch(e => console.error('PG Insert Contact Error:', e));
  }
}

function syncPgUpdate(collection, id, row) {
  if (!pgPool) return;
  if (collection === 'cards') {
    pgPool.query(
      `UPDATE cards SET
        slug=$1, name=$2, business=$3, title=$4, photo_url=$5, description=$6, message=$7,
        phone=$8, email=$9, address=$10, whatsapp=$11, whatsapp_group=$12, instagram=$13, facebook=$14,
        linkedin=$15, tiktok=$16, youtube=$17, twitter=$18, theme=$19, site_button_text=$20, products=$21,
        gallery=$22, testimonials=$23, views_count=$24, updated_at=$25
      WHERE id=$26`,
      [
        row.slug, row.name, row.business || null, row.title || null, row.photo_url || null, row.description || null, row.message || null,
        row.phone || null, row.email || null, row.address || null, row.whatsapp || null, row.whatsapp_group || null, row.instagram || null, row.facebook || null,
        row.linkedin || null, row.tiktok || null, row.youtube || null, row.twitter || null, row.theme || 'midnight', row.site_button_text || null,
        JSON.stringify(row.products || []), JSON.stringify(row.gallery || []), JSON.stringify(row.testimonials || []),
        row.views_count || 0, new Date(), id
      ]
    ).catch(e => console.error('PG Update Card Error:', e));
  } else if (collection === 'users') {
    pgPool.query(
      'UPDATE users SET name=$1, email=$2, whatsapp=$3, password_hash=$4 WHERE id=$5',
      [row.name, row.email || null, row.whatsapp || null, row.password_hash, id]
    ).catch(e => console.error('PG Update User Error:', e));
  }
}

function syncPgDelete(collection, id) {
  if (!pgPool) return;
  pgPool.query(`DELETE FROM ${collection} WHERE id=$1`, [id])
    .catch(e => console.error('PG Delete Error:', e));
}

function query(collection) {
  return {
    get() { return db[collection] || []; },
    find(pred) { return (db[collection] || []).filter(pred); },
    findOne(pred) { return (db[collection] || []).find(pred); },
    findById(id) { return (db[collection] || []).find(r => r.id === id); },
    insert(row) {
      row.id = nextId(collection);
      row.created_at = row.created_at || new Date().toISOString();
      db[collection].push(row);
      saveLocalDB(db);
      syncPgInsert(collection, row);
      return row;
    },
    update(id, updates) {
      const idx = (db[collection] || []).findIndex(r => r.id === id);
      if (idx === -1) return null;
      Object.assign(db[collection][idx], updates);
      saveLocalDB(db);
      syncPgUpdate(collection, id, db[collection][idx]);
      return db[collection][idx];
    },
    delete(id) {
      const idx = (db[collection] || []).findIndex(r => r.id === id);
      if (idx === -1) return false;
      db[collection].splice(idx, 1);
      saveLocalDB(db);
      syncPgDelete(collection, id);
      return true;
    },
    count(pred) {
      if (!pred) return (db[collection] || []).length;
      return (db[collection] || []).filter(pred).length;
    }
  };
}

module.exports = { query, db };
