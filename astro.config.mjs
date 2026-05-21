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
        {
          label: 'Developer Docs',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'dev' },
            {
              label: 'Onboarding',
              items: [
                { label: 'Development Setup', slug: 'dev/onboarding/development' },
                { label: 'Build System', slug: 'dev/onboarding/build-system' },
                { label: 'Quick Reference', slug: 'dev/onboarding/quick-reference' },
                { label: 'Your First Contribution', slug: 'dev/onboarding/first-contribution' },
                { label: 'Contributor Gotchas', slug: 'dev/onboarding/gotchas' },
              ],
            },
            {
              label: 'Contributing',
              items: [
                { label: 'UI Contributor Guide', slug: 'dev/contributing/ui' },
                { label: 'Theme Contributor Guide', slug: 'dev/contributing/themes' },
                { label: 'Translation Contributor Guide', slug: 'dev/contributing/translations' },
                { label: 'Plugin Development', slug: 'dev/contributing/plugins' },
                { label: 'Copyright Headers', slug: 'dev/contributing/copyright' },
              ],
            },
            {
              label: 'Reference',
              items: [
                { label: 'LVGL9 XML Guide', slug: 'dev/reference/xml-guide' },
                { label: 'Modal System', slug: 'dev/reference/modals' },
                { label: 'Logging', slug: 'dev/reference/logging' },
                { label: 'Testing', slug: 'dev/reference/testing' },
              ],
            },
            {
              label: 'Printer Platforms',
              items: [
                { label: 'Creality K1 Series', slug: 'dev/printers/creality-k1' },
                { label: 'Creality K2 Series', slug: 'dev/printers/creality-k2' },
                { label: 'FlashForge Adventurer 5X', slug: 'dev/printers/flashforge-ad5x' },
                { label: 'QIDI Printers', slug: 'dev/printers/qidi' },
                { label: 'Snapmaker U1', slug: 'dev/printers/snapmaker-u1' },
                { label: 'AD5M Klipper Mod Variant', slug: 'dev/printers/ad5m-kmod' },
              ],
            },
            {
              label: 'Process',
              items: [
                { label: 'Release Process', slug: 'dev/process/release' },
                { label: 'Installer', slug: 'dev/process/installer' },
              ],
            },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
