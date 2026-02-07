import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://helixscreen.org',
  integrations: [
    starlight({
      title: 'HelixScreen',
      logo: {
        src: './src/assets/images/logo/helix-icon-64.png',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/prestonbrown/helixscreen' },
      ],
      customCss: ['./src/styles/starlight-custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'docs/getting-started' },
        },
        {
          label: 'User Guide',
          autogenerate: { directory: 'docs/user-guide' },
        },
        {
          label: 'Calibration & Tuning',
          autogenerate: { directory: 'docs/calibration' },
        },
        {
          label: 'Multi-Material',
          autogenerate: { directory: 'docs/multi-material' },
        },
        {
          label: 'Configuration',
          autogenerate: { directory: 'docs/configuration' },
        },
        {
          label: 'Troubleshooting',
          autogenerate: { directory: 'docs/troubleshooting' },
        },
        {
          label: 'FAQ',
          autogenerate: { directory: 'docs/faq' },
        },
        {
          label: 'Development',
          autogenerate: { directory: 'docs/development' },
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'docs/reference' },
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
