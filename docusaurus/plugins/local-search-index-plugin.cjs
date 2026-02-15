'use strict';

const fs = require('fs');
const path = require('path');

function walkMarkdownFiles(baseDir) {
  const files = [];
  if (!fs.existsSync(baseDir)) {
    return files;
  }
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        files.push(full);
      }
    }
  }
  return files;
}

function parseFrontMatter(source) {
  if (!source.startsWith('---\n')) {
    return {data: {}, body: source};
  }
  const end = source.indexOf('\n---\n', 4);
  if (end === -1) {
    return {data: {}, body: source};
  }
  const frontMatter = source.slice(4, end);
  const body = source.slice(end + 5);
  const data = {};
  for (const line of frontMatter.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.+)\s*$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    let value = match[2].trim();
    value = value.replace(/^["']|["']$/g, '');
    data[key] = value;
  }
  return {data, body};
}

function stripMarkdown(source) {
  return String(source)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/[#>*_\-\[\]\(\)!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRoute(route) {
  let out = String(route || '/').trim();
  if (!out.startsWith('/')) {
    out = `/${out}`;
  }
  out = out.replace(/\/+/g, '/');
  if (out !== '/' && !out.endsWith('/')) {
    out += '/';
  }
  return out;
}

function routeFromDocFile(baseDir, file, routeBasePath, data) {
  if (data.permalink) {
    return normalizeRoute(data.permalink);
  }
  const rel = path.relative(baseDir, file).replace(/\\/g, '/');
  const noExt = rel.replace(/\.(md|mdx)$/i, '');
  const fileName = path.basename(noExt);
  const dirName = path.dirname(noExt);

  if (data.slug) {
    if (data.slug.startsWith('/')) {
      return normalizeRoute(data.slug);
    }
    return normalizeRoute(`${routeBasePath}/${data.slug}`);
  }

  if (fileName === 'index' || fileName === '_index') {
    if (dirName === '.' || dirName === '') {
      return normalizeRoute(routeBasePath);
    }
    return normalizeRoute(`${routeBasePath}/${dirName}`);
  }
  if (dirName === '.' || dirName === '') {
    return normalizeRoute(`${routeBasePath}/${fileName}`);
  }
  return normalizeRoute(`${routeBasePath}/${dirName}/${fileName}`);
}

function routeFromBlogFile(baseDir, file, data) {
  if (data.permalink) {
    return normalizeRoute(data.permalink);
  }
  let slug = data.slug || '';
  if (!slug) {
    const name = path.basename(file).replace(/\.(md|mdx)$/i, '');
    slug = name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  }
  slug = slug.replace(/^\/+|\/+$/g, '');
  slug = slug.replace(/^blog\//, '');
  return normalizeRoute(`/blog/${slug}`);
}

function titleFromBody(body) {
  const match = body.match(/^\s*#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function buildEntries(context) {
  const entries = [];
  const root = context.siteDir;

  const collections = [
    {base: path.join(root, 'docs'), routeBasePath: '/docs', type: 'docs'},
    {base: path.join(root, 'getting-started'), routeBasePath: '/getting-started', type: 'docs'},
    {base: path.join(root, 'quickstart'), routeBasePath: '/quickstart', type: 'docs'},
  ];

  for (const collection of collections) {
    for (const file of walkMarkdownFiles(collection.base)) {
      const source = fs.readFileSync(file, 'utf8');
      const {data, body} = parseFrontMatter(source);
      const title = data.title || titleFromBody(body) || path.basename(file, path.extname(file));
      const url = routeFromDocFile(collection.base, file, collection.routeBasePath, data);
      entries.push({
        title,
        url,
        text: stripMarkdown(body).slice(0, 12000),
      });
    }
  }

  const blogBase = path.join(root, 'blog');
  for (const file of walkMarkdownFiles(blogBase)) {
    const source = fs.readFileSync(file, 'utf8');
    const {data, body} = parseFrontMatter(source);
    const title = data.title || titleFromBody(body) || path.basename(file, path.extname(file));
    const url = routeFromBlogFile(blogBase, file, data);
    entries.push({
      title,
      url,
      text: stripMarkdown(body).slice(0, 12000),
    });
  }

  return entries;
}

module.exports = function localSearchIndexPlugin(context) {
  return {
    name: 'local-search-index-plugin',
    loadContent() {
      return buildEntries(context);
    },
    contentLoaded({content, actions}) {
      actions.setGlobalData({
        entries: content,
      });
    },
  };
};
