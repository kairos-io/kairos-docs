'use strict';

function parseShortcodeAttrs(raw) {
  const attrs = {};
  const re = /([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*"([^"]*)"/g;
  let m = re.exec(raw || '');
  while (m) {
    attrs[m[1]] = m[2];
    m = re.exec(raw || '');
  }
  return attrs;
}

function transformNonInlineCode(segment) {
  let out = segment;

  out = out.replace(/\{\{<\s*card\b([^>]*)>\}\}/gi, (_full, rawAttrs) => {
    const attrs = parseShortcodeAttrs(rawAttrs);
    const parts = [];
    if (attrs.header) parts.push(attrs.header);
    if (attrs.subtitle) parts.push(attrs.subtitle);
    if (attrs.footer) parts.push(attrs.footer);
    return parts.join('\n');
  });
  out = out.replace(/\{\{<\s*\/card\s*>\}\}/gi, '');

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
      'tabs', 'tabitem',
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

  // Render supported simple value shortcodes as MDX components outside code.
  out = out.replace(/\{\{<\s*container-repo-link\b([^>]*)>\}\}/gi, (_full, rawAttrs) => {
    const attrs = parseShortcodeAttrs(rawAttrs);
    const flavor = (attrs.flavor || '').replace(/"/g, '&quot;');
    return `<ContainerRepoLink flavor="${flavor}" />`;
  });
  out = out.replace(/\{\{<\s*ociCode\b([^>]*)>\}\}/gi, (_full, rawAttrs) => {
    const attrs = parseShortcodeAttrs(rawAttrs);
    const props = [];
    if (attrs.variant) props.push(`variant="${attrs.variant.replace(/"/g, '&quot;')}"`);
    if (attrs.arch) props.push(`arch="${attrs.arch.replace(/"/g, '&quot;')}"`);
    if (attrs.model) props.push(`model="${attrs.model.replace(/"/g, '&quot;')}"`);
    if (attrs.suffix) props.push(`suffix="${attrs.suffix.replace(/"/g, '&quot;')}"`);
    return `<OciCode ${props.join(' ')} />`;
  });
  out = out.replace(/\{\{<\s*getRemoteSource\s+"([^"]+)"\s*>\}\}/gi, (_full, url) => {
    const safeUrl = String(url || '').replace(/"/g, '&quot;');
    return `<GetRemoteSource url="${safeUrl}" />`;
  });
  out = out.replace(/\{\{<\s*getRemoteSource\b([^>]*)>\}\}/gi, (_full, rawAttrs) => {
    const attrs = parseShortcodeAttrs(rawAttrs);
    const url = (attrs.url || '').replace(/"/g, '&quot;');
    if (!url) return _full;
    return `<GetRemoteSource url="${url}" />`;
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
        const shortcodeNameMatch = shortcode.match(/^\{\{[<%]\s*\/?\s*([A-Za-z0-9_-]+)/);
        const shortcodeName = shortcodeNameMatch ? shortcodeNameMatch[1].toLowerCase() : '';
        const supportedInlineShortcodes = new Set([
          'card',
          'container-repo-link',
          'ocicode',
          'getremotesource',
        ]);
        if (supportedInlineShortcodes.has(shortcodeName)) {
          out += shortcode;
        } else {
          out += `\`${shortcode}\``;
        }
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
  let onlyFlavorsFence = false;
  let inMultilineShortcode = false;
  let inJsonLdScript = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.match(/^<script\b/i) && /type\s*=\s*["']application\/ld\+json["']/i.test(trimmed)) {
      inJsonLdScript = true;
      out.push(line);
      continue;
    }
    if (inJsonLdScript) {
      out.push(line);
      if (trimmed.match(/^<\/script>/i)) {
        inJsonLdScript = false;
      }
      continue;
    }

    if (/^(```|~~~)/.test(trimmed)) {
      if (!inFence) {
        const openMatch = trimmed.match(/^(```|~~~)(.*)$/);
        const fenceMarker = openMatch ? openMatch[1] : '```';
        const fenceInfo = openMatch ? String(openMatch[2] || '').trim() : '';
        const onlyFlavorsMatch = fenceInfo.match(/^([A-Za-z0-9_-]+)\s+\{class="only-flavors=([^"]+)"\}\s*$/);
        if (onlyFlavorsMatch) {
          const language = onlyFlavorsMatch[1];
          const onlyFlavors = onlyFlavorsMatch[2].replace(/"/g, '&quot;');
          out.push(`<OnlyFlavors onlyFlavors="${onlyFlavors}">`);
          out.push(`${fenceMarker}${language}`);
          inFence = true;
          onlyFlavorsFence = true;
          continue;
        }
        inFence = true;
        out.push(line);
        continue;
      }

      inFence = false;
      out.push(line);
      if (onlyFlavorsFence) {
        out.push('</OnlyFlavors>');
        onlyFlavorsFence = false;
      }
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
