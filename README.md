# Kairos documentation

The Kairos documentation is built with [Docusaurus](https://docusaurus.io/) and deployed with [Netlify](https://app.netlify.com/projects/kairos-io/deploys).

## Prerequisites

- Node.js `>=20` (Netlify build currently uses `24.13.0`)
- npm

## Local development

```bash
git clone https://github.com/kairos-io/kairos-docs
cd kairos-docs
npm ci
npm run start
```

The dev server is available at `http://localhost:3000`.

## Build and preview

```bash
npm run build
npm run serve
```

This generates the static site in `build/`.

## Useful scripts

- `npm run start` - start local dev server
- `npm run build` - produce production build
- `npm run serve` - serve the built site locally
- `npm run typecheck` - run TypeScript checks
