const fs = require('node:fs');
const path = require('node:path');

function parseScalar(value) {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (trimmed === '|' || trimmed === '>') {
    return '';
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return trimmed;
}

function readFrontMatter(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---\n')) {
    return {};
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return {};
  }

  const raw = content.slice(4, end);
  const data = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1);
    data[key] = parseScalar(value);
  }

  return data;
}

function parseLayoutMetadata(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const source = fs.readFileSync(filePath, 'utf8');
  const titleMatch = source.match(/<Layout[\s\S]*?title="([^"]+)"/);
  const descriptionMatch = source.match(/<Layout[\s\S]*?description="([^"]+)"/);
  return {
    title: titleMatch ? titleMatch[1] : undefined,
    description: descriptionMatch ? descriptionMatch[1] : undefined,
  };
}

function collectMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const entries = fs.readdirSync(dirPath, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(absolutePath));
      continue;
    }
    if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toAbsoluteUrl(origin, pathname) {
  const left = origin.replace(/\/$/, '');
  const right = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${left}${right}`;
}

function sortByPositionThenTitle(items) {
  return [...items].sort((a, b) => {
    const aPos = Number.isFinite(a.position) ? a.position : Number.MAX_SAFE_INTEGER;
    const bPos = Number.isFinite(b.position) ? b.position : Number.MAX_SAFE_INTEGER;
    if (aPos !== bPos) {
      return aPos - bPos;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
}

function createLlmsTxtContent({siteConfig, siteDir}) {
  const origin = `${siteConfig.url.replace(/\/$/, '')}${siteConfig.baseUrl === '/' ? '' : siteConfig.baseUrl.replace(/\/$/, '')}`;
  const siteTitle = siteConfig.title || 'Site';
  const siteDescription =
    siteConfig.customFields?.siteDescription ||
    siteConfig.customFields?.description ||
    siteConfig.tagline ||
    '';

  const docsRoot = path.join(siteDir, 'docs');
  const gettingStartedRoot = path.join(siteDir, 'getting-started');
  const quickstartRoot = path.join(siteDir, 'quickstart');

  const eventsMeta = parseLayoutMetadata(path.join(siteDir, 'src', 'pages', 'events', 'index.tsx'));
  const pressMeta = parseLayoutMetadata(path.join(siteDir, 'src', 'pages', 'press', 'index.tsx'));
  const gettingStartedIndex = readFrontMatter(path.join(gettingStartedRoot, 'index.md'));
  const quickstartIndex = readFrontMatter(path.join(quickstartRoot, 'index.md'));
  const docsIndex = readFrontMatter(path.join(docsRoot, 'index.md'));

  const topPages = [
    {
      title: eventsMeta.title || 'Events',
      description: eventsMeta.description,
      path: '/events/',
    },
    {
      title: pressMeta.title || 'Press',
      description: pressMeta.description,
      path: '/press/',
    },
    {
      title: gettingStartedIndex.title || 'Getting Started',
      description: gettingStartedIndex.description,
      path: '/getting-started/',
    },
    {
      title: quickstartIndex.title || 'Hadron Quickstart',
      description: quickstartIndex.description,
      path: '/quickstart/',
    },
    {
      title: docsIndex.title || 'Documentation',
      description: docsIndex.description,
      path: '/docs/',
    },
  ];

  const lines = [];
  lines.push(`# ${siteTitle}`);
  lines.push('');
  if (siteDescription) {
    lines.push(`> ${siteDescription}`);
    lines.push('');
  }

  for (const page of topPages) {
    const descriptionSuffix = page.description ? `: ${page.description}` : '';
    lines.push(`- [${page.title}](${toAbsoluteUrl(origin, page.path)})${descriptionSuffix}`);
    lines.push('');
  }

  lines.push('## Events');
  lines.push('');
  lines.push(`> ${eventsMeta.description || ''}`);
  lines.push('');
  lines.push('');

  lines.push('## Press');
  lines.push('');
  lines.push(`> ${pressMeta.description || ''}`);
  lines.push('');
  lines.push('');

  const gettingStartedDocs = sortByPositionThenTitle(
    collectMarkdownFiles(gettingStartedRoot)
      .filter((filePath) => path.basename(filePath) !== 'index.md')
      .map((filePath) => {
        const fm = readFrontMatter(filePath);
        const rel = path.relative(gettingStartedRoot, filePath).replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');
        const slug = typeof fm.slug === 'string' ? fm.slug : `/${rel}`;
        return {
          title: fm.title || path.basename(rel),
          description: fm.description,
          position: fm.sidebar_position,
          url: toAbsoluteUrl(origin, `/getting-started${slug.startsWith('/') ? slug : `/${slug}`}`),
          excluded: fm.sitemap_exclude === true,
        };
      })
      .filter((item) => !item.excluded),
  );

  lines.push(`## ${topPages[2].title}`);
  lines.push('');
  if (topPages[2].description) {
    lines.push(`> ${topPages[2].description}`);
    lines.push('');
    lines.push('');
  }
  for (const page of gettingStartedDocs) {
    const descriptionSuffix = page.description ? `: ${page.description}` : '';
    lines.push(`- [${page.title}](${page.url})${descriptionSuffix}`);
    lines.push('');
  }

  const quickstartDocs = sortByPositionThenTitle(
    collectMarkdownFiles(quickstartRoot)
      .filter((filePath) => path.basename(filePath) !== 'index.md')
      .map((filePath) => {
        const fm = readFrontMatter(filePath);
        const rel = path.relative(quickstartRoot, filePath).replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');
        const slug = typeof fm.slug === 'string' ? fm.slug : `/${rel}`;
        return {
          title: fm.title || path.basename(rel),
          description: fm.description,
          position: fm.sidebar_position,
          url: toAbsoluteUrl(origin, `/quickstart${slug.startsWith('/') ? slug : `/${slug}`}`),
          excluded: fm.sitemap_exclude === true,
        };
      })
      .filter((item) => !item.excluded),
  );

  lines.push(`## ${topPages[3].title}`);
  lines.push('');
  if (topPages[3].description) {
    lines.push(`> ${topPages[3].description}`);
    lines.push('');
    lines.push('');
  }
  for (const page of quickstartDocs) {
    const descriptionSuffix = page.description ? `: ${page.description}` : '';
    lines.push(`- [${page.title}](${page.url})${descriptionSuffix}`);
    lines.push('');
  }

  const sectionDirs = fs
    .readdirSync(docsRoot, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const sections = sortByPositionThenTitle(
    sectionDirs
      .map((dirName) => {
        const categoryPath = path.join(docsRoot, dirName, '_category_.json');
        if (!fs.existsSync(categoryPath)) {
          return null;
        }
        const category = JSON.parse(fs.readFileSync(categoryPath, 'utf8'));
        return {
          dirName,
          title: category.link?.title || category.label || dirName,
          description: category.link?.description,
          position: category.position,
          slug: category.link?.slug || `/${dirName}`,
        };
      })
      .filter(Boolean),
  );

  lines.push(`## ${topPages[4].title}`);
  lines.push('');
  if (topPages[4].description) {
    lines.push(`> ${topPages[4].description}`);
    lines.push('');
  }
  for (const section of sections) {
    const descriptionSuffix = section.description ? `: ${section.description}` : '';
    lines.push(
      `- [${section.title}](${toAbsoluteUrl(origin, `/docs${section.slug.startsWith('/') ? section.slug : `/${section.slug}`}/`)})${descriptionSuffix}`,
    );
    lines.push('');
  }

  for (const section of sections) {
    lines.push(`### ${section.title}`);
    lines.push('');
    if (section.description) {
      lines.push(`> ${section.description}`);
      lines.push('');
      lines.push('');
    }

    const sectionRoot = path.join(docsRoot, section.dirName);
    const pages = sortByPositionThenTitle(
      collectMarkdownFiles(sectionRoot)
        .filter((filePath) => !filePath.endsWith('/_index.md'))
        .map((filePath) => {
          const fm = readFrontMatter(filePath);
          const rel = path.relative(docsRoot, filePath).replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');

          let urlPath;
          if (typeof fm.slug === 'string' && fm.slug.startsWith('/')) {
            urlPath = `/docs${fm.slug}`;
          } else {
            urlPath = `/docs/${rel}`;
          }

          if (urlPath.endsWith('/index')) {
            urlPath = urlPath.slice(0, -6);
          }

          return {
            title: fm.title || path.basename(rel),
            description: fm.description,
            position: fm.sidebar_position,
            excluded: fm.sitemap_exclude === true,
            url: toAbsoluteUrl(origin, `${urlPath}/`),
          };
        })
        .filter((item) => !item.excluded),
    );

    for (const page of pages) {
      const descriptionSuffix = page.description ? `: ${page.description}` : '';
      lines.push(`- [${page.title}](${page.url})${descriptionSuffix}`);
    }
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

module.exports = function llmsTxtPlugin(context) {
  return {
    name: 'llms-txt-plugin',
    async postBuild({outDir, siteConfig}) {
      const llmsText = createLlmsTxtContent({siteConfig, siteDir: context.siteDir});
      const outputPath = path.join(outDir, 'llms.txt');
      fs.writeFileSync(outputPath, llmsText, 'utf8');
    },
  };
};
