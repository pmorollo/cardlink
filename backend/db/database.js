// Camada de compatibilidade com o repositório tipado (repository.js).
// As rotas devem usar repository.{users,cards,contacts,supportTickets}.
// Este arquivo preserva o armazenamento local (memória/JSON) e o exporta
// para a suite de testes, além de um wrapper `query()` legado para o
// modo JSON (sem PostgreSQL).

const fs = require('fs');
const path = require('path');
const repo = require('./repository');

const DB_PATH = path.join(__dirname, 'data.json');

const db = repo.db;

function saveLocalDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar DB local:', e.message);
  }
}

function nextId(collection) {
  db._counters[collection] = (db._counters[collection] || 0) + 1;
  return db._counters[collection];
}

// Wrapper legado (modo JSON). Prefira o repositório nas novas rotas.
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
      return row;
    },
    update(id, updates) {
      const idx = (db[collection] || []).findIndex(r => r.id === id);
      if (idx === -1) return null;
      Object.assign(db[collection][idx], updates);
      saveLocalDB(db);
      return db[collection][idx];
    },
    delete(id) {
      const idx = (db[collection] || []).findIndex(r => r.id === id);
      if (idx === -1) return false;
      db[collection].splice(idx, 1);
      saveLocalDB(db);
      return true;
    },
    count(pred) {
      if (!pred) return (db[collection] || []).length;
      return (db[collection] || []).filter(pred).length;
    }
  };
}

module.exports = { query, db, isPgConfigured: repo.isPgConfigured, repository: repo };