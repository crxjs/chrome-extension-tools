// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'CRXJS Vite Plugin',
  tagline: 'Build Chrome Extensions with Vite',
  url: 'https://crxjs.dev',
  baseUrl: process.env.VERCEL_ENV === 'production' ? '/vite-plugin/' : '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Add custom scripts to inject the banner
  customFields: {
    maintenanceBanner: true,
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/crxjs/chrome-extension-tools/tree/main/packages/vite-plugin-docs/',
        },
        theme: {
          customCss: [
            require.resolve('./src/css/custom.css'),
          ],
        },
        blog: false,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'CRXJS',
        logo: {
          alt: 'CRXJS Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'index',
            position: 'left',
            label: 'Vite Plugin',
          },
          {
            href: 'https://extend-chrome.dev/rollup-plugin',
            label: 'Rollup Plugin',
            position: 'left',
          },
          {
            href: 'https://github.com/crxjs/chrome-extension-tools',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://www.npmjs.com/package/@crxjs/vite-plugin',
            label: 'NPM',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} CRXJS`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),

  plugins: [require.resolve('docusaurus-lunr-search')],
}

module.exports = config