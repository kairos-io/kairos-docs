'use strict';

function transformNonInlineCode(segment) {
  let out = segment;

  // Make HTML <br> tags explicit self-closing tags for MDX compatibility.
  out = out.replace(/<br>/gi, '<br />');

  // Avoid SSG runtime ReferenceErrors from shell-style ${VARS} in prose.
  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_full, name) => `\`\${${name}}\``);

  // Placeholders like <TOKEN> / <role> are parsed as JSX tags by MDX.
  out = out.replace(/<([A-Za-z][A-Za-z0-9_-]*(?: [A-Za-z0-9_-]+)*)>/g, (full, tag) => {
    const normalized = String(tag).toLowerCase();
    const htmlTags = new Set([
      'a', 'b', 'blockquote', 'br', 'code', 'details', 'div', 'em', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong',
      'summary', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
    ]);
    if (htmlTags.has(normalized)) {
      return full;
    }
    return `\`${full}\``;
  });

  // Make HTML img tags explicit self-closing tags for MDX compatibility.
  out = out.replace(/<img([^>]*?)>/g, (full, attrs) => {
    return /\/\s*>$/.test(full) ? full : `<img${attrs} />`;
  });

  return out;
}

function wrapShortcodesOutsideInline(line) {
  let out = '';
  let i = 0;
  let inInlineCode = false;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '`') {
      inInlineCode = !inInlineCode;
      out += ch;
      i += 1;
      continue;
    }

    if (!inInlineCode && (line.startsWith('{{<', i) || line.startsWith('{{%', i))) {
      const close = line.startsWith('{{<', i) ? '>}}' : '%}}';
      const end = line.indexOf(close, i + 3);
      if (end !== -1) {
        const shortcode = line.slice(i, end + close.length);
        out += `\`${shortcode}\``;
        i = end + close.length;
        continue;
      }
    }

    out += ch;
    i += 1;
  }

  return out;
}

function normalizeOutsideCode(line) {
  const out = wrapShortcodesOutsideInline(line);

  // Avoid changing shortcode text inside inline markdown code spans.
  const parts = out.split('`');
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = transformNonInlineCode(parts[i]);
  }
  return parts.join('`');
}

module.exports = function hugoMdxPreprocessLoader(source) {
  const input = String(source);
  const lines = input.split('\n');
  const out = [];
  let inFence = false;
  let inMultilineShortcode = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    if (inMultilineShortcode) {
      out.push(`<!-- ${line.replace(/--/g, '- -')} -->`);
      if (line.includes('>}}') || line.includes('%}}')) {
        inMultilineShortcode = false;
      }
      continue;
    }

    if ((line.includes('{{<') || line.includes('{{%')) && !(line.includes('>}}') || line.includes('%}}'))) {
      inMultilineShortcode = true;
      out.push(`<!-- ${line.replace(/--/g, '- -')} -->`);
      continue;
    }

    out.push(normalizeOutsideCode(line));
  }

  return out.join('\n');
};
