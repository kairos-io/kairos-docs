const DOC_MOBILE_SEARCH_PREFIXES = [
  '/docs',
  '/operator-docs',
  '/quickstart',
  '/hadron-docs',
] as const;

export function isDocsMobileSearchRoute(pathname: string): boolean {
  return DOC_MOBILE_SEARCH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
