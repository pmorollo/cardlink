function write(level, event, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta
  };
  const line = JSON.stringify(payload);
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

module.exports = {
  info(event, meta) { write('info', event, meta); },
  warn(event, meta) { write('warn', event, meta); },
  error(event, meta) { write('error', event, meta); }
};
