// Themes available to Free-plan customers. Pro customers may use any theme
// the frontend exposes (backend/routes/cards.js only enforces this set when
// the requester is not Pro).
//
// Keep this in sync with the free (non-"PRO"-badged) swatches in
// frontend/index.html and with NICHE_TEMPLATES in frontend/app-builder.js —
// every niche template's `theme` value must be a Free theme so it applies
// cleanly for a visitor who signs up straight from the landing page.
const FREE_THEMES = new Set([
  'midnight', 'ocean', 'rose', 'emerald', 'cyber', 'amber',
  'slate', 'violet', 'teal', 'volt', 'wine'
]);

module.exports = { FREE_THEMES };
