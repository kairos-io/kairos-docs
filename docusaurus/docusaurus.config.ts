import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkShortcodeCode from './plugins/remark-shortcode-code';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

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

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  // organizationName: 'jasperdekeuk', // Usually your GitHub org/user name.
  // projectName: 'kairos-docs', // Usually your repo name.

  // Make broken links warnings during local builds so the build can complete
  // while we iteratively fix unresolved internal links across many files.
  // Change back to 'throw' once all internal links are fixed.
  onBrokenLinks: 'warn',

  // GitHub buttons script
  scripts: [
    {
      src: 'https://buttons.github.io/buttons.js',
      async: true,
      defer: true,
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  customFields: {
    registryURL: 'quay.io/kairos',
    auroraBootVersion: 'v0.14.0',
    kairosInitVersion: 'v0.6.2',
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkShortcodeCode],
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/kairos-io/kairos-docs/tree/main/',
          // Show last update time and author
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          // Enable versioning
          lastVersion: 'current',
          versions: {
            current: {
              label: 'Next 🚧',
              path: '',
            },
          },
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/kairos-io/kairos/tree/main/packages/create-kairos/templates/shared/',
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
      '@docusaurus/plugin-content-docs',
      {
        id: 'getting-started',
        path: 'getting-started',
        routeBasePath: 'getting-started',
        sidebarPath: './sidebarsGettingStarted.ts',
        remarkPlugins: [remarkShortcodeCode],
        editUrl:
          'https://github.com/kairos-io/kairos-docs/tree/main/',
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
        editUrl:
          'https://github.com/kairos-io/kairos-docs/tree/main/',
        showLastUpdateTime: true,
        showLastUpdateAuthor: true,
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/Kairos_800x419.png',
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
          label: 'Documentation',
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
          type: 'html',
          position: 'right',
          value: '<a class="github-button" href="https://github.com/kairos-io/kairos" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star kairos-io/kairos on GitHub">Star</a>',
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
      copyright: `Copyright © ${new Date().getFullYear()} Kairos authors`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
