const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro ao carregar DB:', e.message);
  }
  return { users: [], cards: [], contacts: [], _counters: { users: 0, cards: 0, contacts: 0 } };
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const db = loadDB();

function nextId(collection) {
  db._counters[collection] = (db._counters[collection] || 0) + 1;
  return db._counters[collection];
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
      saveDB(db);
      return row;
    },
    update(id, updates) {
      const idx = (db[collection] || []).findIndex(r => r.id === id);
      if (idx === -1) return null;
      Object.assign(db[collection][idx], updates);
      saveDB(db);
      return db[collection][idx];
    },
    delete(id) {
      const idx = (db[collection] || []).findIndex(r => r.id === id);
      if (idx === -1) return false;
      db[collection].splice(idx, 1);
      saveDB(db);
      return true;
    },
    count(pred) {
      if (!pred) return (db[collection] || []).length;
      return (db[collection] || []).filter(pred).length;
    }
  };
}

module.exports = { query, db };
