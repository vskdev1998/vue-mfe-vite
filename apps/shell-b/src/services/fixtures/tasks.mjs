// Offline fallback data (API unreachable or VITE_USE_MOCK_API=true)
export const TASKS = [
  'Set up Vite 7 workspace',
  'Configure Module Federation remotes',
  'Add Sass design tokens',
  'Wire Vuex store per micro-frontend',
  'Create private axios instance',
  'Write webpack → Vite migration notes',
  'Add host login guard',
  'Deploy shell-a to CDN',
  'Deploy shell-b to CDN',
  'Smoke test production build',
].map((title, i) => ({ id: i + 1, title, done: i < 4 }))
