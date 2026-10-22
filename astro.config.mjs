import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightVersions from 'starlight-versions';
import tailwindcss from '@tailwindcss/vite';
import { writeFileSync } from 'node:fs';
import { DOC_VERSIONS, currentSlugRedirects } from './src/data/doc-versions.mjs';
import { SIDEBAR, UNVERSIONED_PREFIX, docExists, presentSidebar } from './src/data/docs-sidebar.mjs';

export default defineConfig({
  site: 'https://helixscreen.org',
  integrations: [
    {
      name: 'current-slug-redirects',
      hooks: {
        'astro:build:done': ({ dir }) => writeFileSync(new URL('_redirects', dir), currentSlugRedirects()),
      },
    },
    starlight({
      title: 'HelixScreen',
      logo: {
        src: './src/assets/images/logo/helix-icon-64.png',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/prestonbrown/helixscreen' },
      ],
      components: {
        ThemeProvider: './src/components/DocsThemeProvider.astro',
        ThemeSelect: './src/components/DocsThemeSelect.astro',
      },
      customCss: ['./src/styles/starlight-custom.css'],
      sidebar: presentSidebar(SIDEBAR, (slug) => docExists('./src/content/docs', slug)),
      plugins: [
        starlightVersions({
          current: { label: DOC_VERSIONS.current.label },
          versions: DOC_VERSIONS.others.map(({ slug, label }) => ({ slug, label })),
          exclude: [`${UNVERSIONED_PREFIX}/**`],
        }),
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
