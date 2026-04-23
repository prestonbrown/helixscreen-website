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
          items: [
            { label: 'Getting Started', slug: 'guide/getting-started' },
            { label: 'Home Panel', slug: 'guide/home-panel' },
            { label: 'Printing', slug: 'guide/printing' },
            { label: 'Temperature', slug: 'guide/temperature' },
            { label: 'Motion', slug: 'guide/motion' },
            { label: 'Filament', slug: 'guide/filament' },
            { label: 'Calibration', slug: 'guide/calibration' },
            { label: 'Advanced Features', slug: 'guide/advanced' },
            { label: 'Beta Features', slug: 'guide/beta-features' },
            { label: 'Tips & Tricks', slug: 'guide/tips' },
          ],
        },
        {
          label: 'Settings',
          items: [
            { label: 'Overview', slug: 'guide/settings' },
            { label: 'Display & Sound', slug: 'guide/settings/display-sound' },
            { label: 'Printing', slug: 'guide/settings/printing' },
            { label: 'Hardware & Devices', slug: 'guide/settings/hardware' },
            { label: 'Safety & Notifications', slug: 'guide/settings/safety' },
            { label: 'System', slug: 'guide/settings/system' },
            { label: 'Help & About', slug: 'guide/settings/help-about' },
            { label: 'LED Settings', slug: 'guide/settings/led-settings' },
          ],
        },
        {
          label: 'Platform Guides',
          items: [
            { label: 'Creality K1C Setup', slug: 'guide/creality-k1c-setup' },
            { label: 'Bluetooth Setup', slug: 'guide/bluetooth-setup' },
            { label: 'Barcode Scanner', slug: 'guide/barcode-scanner' },
            { label: 'Label Printing', slug: 'guide/label-printing' },
            { label: 'Touch Calibration', slug: 'guide/touch-calibration' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Configuration', slug: 'reference/configuration' },
            { label: 'Troubleshooting', slug: 'reference/troubleshooting' },
            { label: 'FAQ', slug: 'reference/faq' },
          ],
        },
        {
          label: 'Legal',
          items: [
            { label: 'Privacy Policy', slug: 'legal/privacy' },
            { label: 'Telemetry', slug: 'legal/telemetry' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
