import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

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

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'kairos-io', // Usually your GitHub org/user name.
  projectName: 'kairos', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/kairos-io/kairos/tree/main/packages/create-kairos/templates/shared/',
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
          to: '/docs/getting-started',
          position: 'left',
          label: 'Getting Started',
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          label: 'Community',
          position: 'left',
          href: 'https://kairos.io/community/',
        },
        {
          href: 'https://github.com/kairos-io/kairos',
          label: 'GitHub',
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
              to: '/docs/_index',
            },
            {
              label: 'Installation',
              to: '/docs/Installation/_index',
            },
            {
              label: 'Architecture',
              to: '/docs/Architecture/_index',
            },
            {
              label: 'Examples',
              to: '/docs/Examples/_index',
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
      copyright: `Copyright © ${new Date().getFullYear()} Kairos authors. The Linux Foundation® (TLF) has registered trademarks and uses trademarks.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
