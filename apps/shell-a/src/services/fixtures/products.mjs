// Offline fallback data used when the public API is unreachable
// (corporate proxy, no internet) or when VITE_USE_MOCK_API=true.
const svg = (label, hue) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="hsl(${hue},70%,90%)"/><text x="50%" y="54%" font-family="sans-serif" font-size="34" text-anchor="middle" fill="hsl(${hue},50%,35%)">${label}</text></svg>`,
  )}`

export const PRODUCTS = [
  ['Aurora Phone X', 699, 'smartphones', 4.6],
  ['Nimbus Laptop 14', 1199, 'laptops', 4.4],
  ['Pulse Earbuds', 89, 'audio', 4.2],
  ['Orbit Smartwatch', 249, 'wearables', 4.1],
  ['Vertex Tablet 11', 499, 'tablets', 4.5],
  ['Lumen Desk Lamp', 39, 'home', 4.0],
  ['Glide Mouse', 29, 'accessories', 4.3],
  ['Forge Keyboard', 119, 'accessories', 4.7],
  ['Echo Speaker Mini', 59, 'audio', 3.9],
  ['Zenith Monitor 27', 329, 'monitors', 4.6],
  ['Trail Backpack', 79, 'bags', 4.4],
  ['Spark Charger 65W', 45, 'accessories', 4.5],
].map(([title, price, category, rating], i) => ({
  id: i + 1,
  title,
  price,
  category,
  rating,
  thumbnail: svg(title.split(' ')[0], (i * 37) % 360),
}))
