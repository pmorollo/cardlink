// Themes available to Free-plan customers. Pro customers may use any theme
// the frontend exposes (backend/routes/cards.js only enforces this set when
// the requester is not Pro).
//
// "current" is the catalog actually offered today (builder's theme picker,
// landing niche picker, NICHE_TEMPLATES in frontend/app-builder.js). "legacy"
// themes are no longer offered anywhere in the UI, but stay in FREE_THEMES so
// existing customers' already-published cards — created back when those
// themes were the norm — keep rendering with their original look and don't
// get silently downgraded to 'institucional' the next time they save.
const CURRENT_FREE_THEMES = ['institucional', 'pessoal', 'profissional', 'comercial'];
const LEGACY_FREE_THEMES = [
  'midnight', 'ocean', 'rose', 'emerald', 'cyber', 'amber',
  'slate', 'violet', 'teal', 'volt', 'wine'
];

const FREE_THEMES = new Set([...CURRENT_FREE_THEMES, ...LEGACY_FREE_THEMES]);

module.exports = { FREE_THEMES, CURRENT_FREE_THEMES, LEGACY_FREE_THEMES };
