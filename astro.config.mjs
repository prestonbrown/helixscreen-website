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
      components: {
        ThemeProvider: './src/components/ForceDarkTheme.astro',
        ThemeSelect: './src/components/EmptyComponent.astro',
      },
      customCss: ['./src/styles/starlight-custom.css'],
      sidebar: [
        {
          label: 'Installation',
          items: [
            { label: 'Install', slug: 'installation' },
            { label: 'Upgrading', slug: 'upgrading' },
          ],
        },
        {
          label: 'User Guide',
          autogenerate: { directory: 'guide' },
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
        {
          label: 'Legal',
          autogenerate: { directory: 'legal' },
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
