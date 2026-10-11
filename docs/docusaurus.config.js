// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

// Where the docs are served and where the app lives. Both come from the build environment so
// the same source builds for any host. The defaults are the Cloudflare Pages deployment.
const SITE_URL = process.env.DOCS_SITE_URL || 'https://docs.structra.pages.dev';
const BASE_URL = process.env.DOCS_BASE_URL || '/';
const APP_URL = (process.env.DOCS_APP_URL || 'https://structra.pages.dev').replace(/\/$/, '');
const SUPPORT_EMAIL = process.env.DOCS_SUPPORT_EMAIL || 'structra.support@gmail.com';
const REPO_URL = 'https://github.com/dibyajyoti-chakrabarti/structra';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Structra Documentation',
  tagline: 'Architecture Quality Intelligence for Engineering Teams',
  favicon: 'img/logo.png',

  future: {
    v4: true,
  },

  url: SITE_URL,
  baseUrl: BASE_URL,

  organizationName: 'structra',
  projectName: 'structra-docs',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // The static search script reads the app URL from this global, set before it runs.
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `window.STRUCTRA_APP_URL = ${JSON.stringify(APP_URL)};`,
    },
  ],

  scripts: [
    {
      src: `${BASE_URL}js/sidebar-search.js`,
      defer: true,
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Dark-first configuration for an enterprise AI product feel.
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        // Keep only explicit light/dark switching (no ambiguous system mode).
        respectPrefersColorScheme: false,
      },

      // Focused, high-signal product message at the top of every page.
      announcementBar: {
        id: 'structra-positioning',
        content:
          'Structra · Architecture Quality Intelligence for Engineering Teams',
        isCloseable: true,
      },

      navbar: {
        title: 'structra',
        logo: {
          alt: 'Structra Logo',
          src: 'img/logo.png',
          srcDark: 'img/logo.png',
          href: '/',
          target: '_self',
        },
        items: [
          {
            href: `${APP_URL}/app/workspaces`,
            label: 'Workspaces',
            position: 'right',
            className: 'header-link nav-workspaces',
          },
          {
            href: `${APP_URL}/pricing`,
            label: 'Pricing',
            position: 'right',
            className: 'header-link nav-pricing nav-ghost',
          },
          {
            href: `${APP_URL}/app`,
            label: 'Open App',
            position: 'right',
            className: 'header-link nav-open-app nav-cta',
          },
        ],
      },

      footer: {
        style: 'dark',
        links: [
          {
            title: 'Platform',
            items: [
              {label: 'Workspaces', href: `${APP_URL}/app/workspaces`},
              {label: 'Open App', href: `${APP_URL}/app`},
              {label: 'Pricing', href: `${APP_URL}/pricing`},
            ],
          },
          {
            title: 'Documentation',
            items: [
              {label: 'Getting Started', to: '/getting-started'},
              {label: 'Evaluation Principles', to: '/evaluation-principles'},
              {label: 'Structra Basics', to: '/evaluation-principles/structra-basics'},
            ],
          },
          {
            title: 'Resources',
            items: [
              {label: 'GitHub', href: REPO_URL},
              {label: 'Support', href: `mailto:${SUPPORT_EMAIL}`},
            ],
          },
        ],
        // Using HTML here keeps the footer compact and brand-aligned.
        copyright: `© ${new Date().getFullYear()} Structra · All rights reserved.<br/><span class="footer-powered">Powered by Structra</span>`,
      },

      prism: {
        theme: prismThemes.oneLight,
        darkTheme: prismThemes.oneDark,
      },
    }),
};

export default config;
