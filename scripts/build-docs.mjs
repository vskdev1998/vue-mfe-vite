#!/usr/bin/env node
/**
 * Builds docs/site/index.html: one self-contained developer documentation page
 * generated from the Markdown files in this repo (single source of truth).
 *
 *   npm run docs:build   → regenerate docs/site/index.html
 *   npm run docs         → regenerate + serve it at http://localhost:5050
 *
 * To add a page: add an entry to PAGES below.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked, Renderer } from 'marked'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

const PAGES = [
  { id: 'overview', group: 'Getting started', title: 'Overview', file: 'README.md' },
  { id: 'architecture', group: 'Guides', title: 'Architecture', file: 'docs/ARCHITECTURE.md' },
  { id: 'vite-config', group: 'Guides', title: 'vite.config.mjs + env', file: 'docs/VITE_CONFIG.md' },
  { id: 'environments', group: 'Guides', title: 'Environments', file: 'docs/ENVIRONMENTS.md' },
  { id: 'ui-dev', group: 'Guides', title: 'ui-dev UI library', file: 'docs/UI_DEV_LIBRARY.md' },
  { id: 'vite7', group: 'Guides', title: 'Vite 7 guide', file: 'docs/VITE7_GUIDE.md' },
  { id: 'migration', group: 'Guides', title: 'webpack → Vite migration', file: 'docs/WEBPACK_TO_VITE_MIGRATION.md' },
  { id: 'host', group: 'Apps', title: 'Host · :5000', file: 'apps/host/README.md' },
  { id: 'shell-a', group: 'Apps', title: 'Shell A · :5001', file: 'apps/shell-a/README.md' },
  { id: 'shell-b', group: 'Apps', title: 'Shell B · :5002', file: 'apps/shell-b/README.md' },
]

const byFile = new Map(PAGES.map((p) => [p.file, p.id]))

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function renderPage(page) {
  const md = readFileSync(resolve(root, page.file), 'utf8')
  const toc = []
  const used = new Map()
  const marked = new Marked({ gfm: true })

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        let id = slugify(text) || 'section'
        const n = used.get(id) || 0
        used.set(id, n + 1)
        if (n) id = `${id}-${n}`
        const anchor = `${page.id}--${id}`
        if (depth === 2 || depth === 3) toc.push({ depth, text: text.replace(/<[^>]+>/g, ''), anchor })
        if (depth === 1) return `<h1 id="${anchor}">${text}</h1>\n`
        return `<h${depth} id="${anchor}"><a class="anchor" href="#/${page.id}/${id}" aria-label="Link to this section">#</a>${text}</h${depth}>\n`
      },
      code({ text, lang }) {
        const label = (lang || 'text').split(/\s/)[0]
        return `<div class="code"><div class="code__bar"><span>${escapeHtml(label)}</span><button type="button" class="code__copy">Copy</button></div><pre><code class="lang-${escapeHtml(label)}">${escapeHtml(text)}</code></pre></div>\n`
      },
      table(token) {
        return `<div class="table-wrap">${Renderer.prototype.table.call(this, token)}</div>`
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens)
        let target = href
        if (!/^(https?:|mailto:|#)/.test(href)) {
          // Rewrite repo-relative .md links to in-page routes
          const [path, hash] = href.split('#')
          const abs = posix.normalize(posix.join(posix.dirname(page.file), path))
          const id = byFile.get(abs)
          if (id) target = `#/${id}${hash ? '/' + hash : ''}`
          else target = posix.relative('docs/site', abs) // e.g. ../../apps/host/vite.config.js
        } else if (href.startsWith('#')) {
          target = `#/${page.id}/${href.slice(1)}`
        }
        const ext = /^https?:/.test(target) ? ' target="_blank" rel="noopener"' : ''
        return `<a href="${escapeHtml(target)}"${title ? ` title="${escapeHtml(title)}"` : ''}${ext}>${text}</a>`
      },
    },
  })

  const html = marked
    .parse(md)
    // GitHub-style task list checkboxes: make them read-only but visible
    .replace(/<input (checked="" )?disabled="" type="checkbox">/g, (m) => m.replace('disabled=""', 'disabled'))
  const plain = md.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`|_[\]()]/g, ' ').replace(/\s+/g, ' ')
  return { ...page, html, toc, plain }
}

const pages = PAGES.map(renderPage)
const template = readFileSync(resolve(root, 'scripts/docs-template.html'), 'utf8')

const nav = [...new Set(pages.map((p) => p.group))]
  .map(
    (g) =>
      `<div class="nav__group"><p class="nav__label">${g}</p>${pages
        .filter((p) => p.group === g)
        .map((p) => `<a class="nav__link" href="#/${p.id}" data-page="${p.id}">${p.title}</a>`)
        .join('')}</div>`,
  )
  .join('')

const sections = pages
  .map(
    (p) =>
      `<article class="doc" id="page-${p.id}" data-page="${p.id}" hidden>
<p class="doc__source">Source: <code>${p.file}</code></p>
${p.html}
</article>`,
  )
  .join('\n')

const index = pages.map((p) => ({
  id: p.id,
  title: p.title,
  toc: p.toc,
  text: p.plain.slice(0, 20000),
}))

const out = template
  .replace('<!--NAV-->', nav)
  .replace('<!--PAGES-->', sections)
  .replace('/*INDEX*/null', JSON.stringify(index).replace(/</g, '\\u003c'))
  .replaceAll('%VERSION%', pkg.version)
  .replace('%BUILT%', new Date().toISOString().slice(0, 10))

mkdirSync(resolve(root, 'docs/site'), { recursive: true })
writeFileSync(resolve(root, 'docs/site/index.html'), out)
console.log(`docs/site/index.html written (${pages.length} pages, ${(out.length / 1024).toFixed(0)} kB)`)
