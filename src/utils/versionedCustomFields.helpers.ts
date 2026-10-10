export function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function getVersionFromPathPrefix(pathname: string, prefix: string): string | null {
  const normalized = normalizePathname(pathname);
  const escaped = prefix.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  const match = normalized.match(new RegExp(`^/${escaped}/([^/]+)(?:/|$)`));
  if (!match) {
    return null;
  }

  const candidate = match[1];
  if (/^v\d+\.\d+\.\d+$/.test(candidate)) {
    return candidate;
  }

  return null;
}

export function getDocsVersionFromPath(pathname: string): string | null {
  return getVersionFromPathPrefix(pathname, 'docs');
}

export function getOperatorVersionFromPath(pathname: string): string | null {
  return getVersionFromPathPrefix(pathname, 'operator-docs');
}
