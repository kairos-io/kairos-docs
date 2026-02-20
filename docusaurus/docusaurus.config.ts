import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkShortcodeCode from './plugins/remark-shortcode-code';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const isNetlifyProduction = process.env.CONTEXT === 'production';
const netlifyDeployRef =
  process.env.BRANCH || process.env.HEAD || process.env.REVIEW_ID || 'unknown';
const branchDeployLogMessage = `Netlify branch deploy: ${netlifyDeployRef}`;

const config: Config = {
  title: 'Kairos',
  tagline: 'Transform your Linux system and preferred Kubernetes distribution into a secure bootable image for your edge devices',
  favicon: 'img/logo.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://kairos.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',
  trailingSlash: true,
  scripts: isNetlifyProduction
    ? [
        {
          src: 'https://plausible.io/js/script.outbound-links.tagged-events.js',
          defer: true,
          'data-domain': 'kairos.io',
        },
      ]
    : [],
  headTags: [
    ...(isNetlifyProduction
      ? [
          {
            tagName: 'script',
            attributes: {},
            innerHTML:
              'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }',
          },
        ]
      : []),
    ...(!isNetlifyProduction
      ? [
          {
            tagName: 'script',
            attributes: {},
            innerHTML: `console.log(${JSON.stringify(branchDeployLogMessage)});`,
          },
        ]
      : []),
  ],

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  // organizationName: 'jasperdekeuk', // Usually your GitHub org/user name.
  // projectName: 'kairos-docs', // Usually your repo name.

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  customFields: {
    registryURL: 'quay.io/kairos',
    kairosVersion: 'master',
    k3sVersion: 'v1.35.0+k3s1',
    providerVersion: 'v2.14.0',
    latestVersion: 'v3.7.2',
    auroraBootVersion: 'v0.14.0',
    kairosInitVersion: 'v0.6.2',
    docsVersionCustomFields: {
      'v3.5.7': {
        registryURL: 'quay.io/kairos',
        kairosVersion: 'v3.5.7',
        k3sVersion: 'v1.34.1+k3s1',
        providerVersion: 'v2.13.4',
        auroraBootVersion: 'v0.13.0',
        kairosInitVersion: 'v0.5.26',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkShortcodeCode],
          // Uncomment after migration to re-enable "Edit this page" links.
          // editUrl:
          //   'https://github.com/kairos-io/kairos-docs/tree/main/',
          // Show last update time and author
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          // Enable versioning
          lastVersion: 'v3.7.2',
          versions: {
            current: {
              label: 'Next 🚧',
              path: '',
              banner: 'unreleased',
            },
            'v3.7.2': {
              label: 'v3.7.2',
              path: 'v3.7.2',
              banner: 'none',
            },
          },
        },
        blog: {
          showReadingTime: true,
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Uncomment after migration to re-enable "Edit this page" links.
          // editUrl:
          //   'https://github.com/kairos-io/kairos/tree/main/packages/create-kairos/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    './plugins/hugo-mdx-preprocess-plugin.cjs',
    [
      '@cmfcmf/docusaurus-search-local',
      {
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        language: 'en',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'getting-started',
        path: 'getting-started',
        routeBasePath: 'getting-started',
        sidebarPath: './sidebarsGettingStarted.ts',
        remarkPlugins: [remarkShortcodeCode],
        // Uncomment after migration to re-enable "Edit this page" links.
        // editUrl:
        //   'https://github.com/kairos-io/kairos-docs/tree/main/',
        showLastUpdateTime: true,
        showLastUpdateAuthor: true,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'quickstart',
        path: 'quickstart',
        routeBasePath: 'quickstart',
        sidebarPath: './sidebarsQuickstart.ts',
        remarkPlugins: [remarkShortcodeCode],
        // Uncomment after migration to re-enable "Edit this page" links.
        // editUrl:
        //   'https://github.com/kairos-io/kairos-docs/tree/main/',
        showLastUpdateTime: true,
        showLastUpdateAuthor: true,
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/Kairos_800x419.png',
    announcementBar: {
      id: 'hadron-linux-out',
      content: '⚛️ <a href="/quickstart/">Hadron Linux</a> is out! 🚀',
      backgroundColor: '#1baaff',
      textColor: '#000000',
      isCloseable: true,
    },
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Kairos',
      logo: {
        alt: 'Kairos Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/getting-started',
          position: 'left',
          label: 'Getting Started',
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/quickstart',
          position: 'left',
          label: 'Hadron',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          label: 'Community',
          position: 'left',
          to: '/community/',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
        {
          type: 'custom-flavorSelector',
          position: 'right',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          type: 'custom-githubStars',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              // point to the actual Getting Started landing
              to: '/getting-started',
            },
            {
              label: 'Installation',
              to: '/docs/installation',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture',
            },
            {
              label: 'Examples',
              to: '/docs/examples',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Slack',
              href: 'https://slack.cncf.io/#kairos',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/kairos-io/kairos/discussions',
            },
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/company/kairos-oss/',
            },
            {
              label: 'X (Twitter)',
              href: 'https://x.com/Kairos_OSS',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/kairos-io/kairos',
            },
            {
              label: 'Commercial Support',
              href: 'https://www.spectrocloud.com/solutions/kairos-support',
            },
          ],
        },
      ],
      copyright: `<span class="footer-kairos-wrap"><img src="/index/footer-logo.png" class="footer-kairos-logo" width="167" height="29" alt="Kairos Logo" /></span><span class="footer-supported-by-wrap">Project supported by <a class="footer-supported-by-link" href="https://spectrocloud.com" target="_blank" rel="noopener noreferrer"><img src="/img/spectrocloud-dark.svg" class="footer-supported-by-logo" width="192" height="51" alt="Spectro Cloud logo" /></a></span><span class="footer-copyright-text">Copyright © ${new Date().getFullYear()} Kairos authors</span>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
