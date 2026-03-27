---
title: "User Guide"
sidebar:
  order: 0
---


Complete guide to using HelixScreen, the touchscreen UI for Klipper 3D printers.

![Home Panel](../../assets/images/docs/screenshot-home-panel.png)

---

## Quick Reference

| Sidebar Icon | Panel | What You'll Do There |
|--------------|-------|----------------------|
| Home | Home | Monitor status, start prints, view temperatures |
| Tune | Controls | Move axes, set temperatures, control fans |
| Spool | Filament | Load/unload filament, manage AMS slots |
| Gear | Settings | Configure display, sound, LED, network, sensors |
| More | Advanced | Calibration, history, macros, system tools |

---

## Guide Contents

### [Getting Started](/docs/guide/getting-started/)
Navigation basics, touch gestures, connection status, first-time setup wizard, WiFi configuration, and keyboard input.

![Setup Wizard](../../assets/images/docs/wizard-wifi.png)

### [Home Panel](/docs/guide/home-panel/)
Your printer dashboard — status area, configurable home widgets (temperature, network, LED, AMS, power, notifications, and more), active tool badge for toolchanger printers, emergency stop, and the Printer Manager with custom images. Customize which widgets appear and their order via **Settings > Home Widgets**. Long-press the lightbulb widget for full LED controls with color, brightness, effects, and WLED presets.

### [Printing](/docs/guide/printing/)
The full printing workflow — file selection, preview, pre-print options, monitoring active prints, tune overlay, Z-offset baby steps, pressure advance, exclude object, and post-print summary.

![Print File Detail](../../assets/images/docs/print-detail.png)

### [Temperature Control](/docs/guide/temperature/)
Nozzle and bed temperature panels, multi-extruder selector for printers with multiple extruders, material presets, and live temperature graphs.

### [Motion & Positioning](/docs/guide/motion/)
Jog pad controls, homing, distance increments, and emergency stop.

![Motion Controls](../../assets/images/docs/screenshot-motion-panel.png)

### [Filament Management](/docs/guide/filament/)
Extrusion controls, load/unload procedures, AMS multi-material systems with multi-backend support (run Happy Hare, AFC, ValgACE, or Tool Changer simultaneously), Spoolman integration, and dryer control.

![AMS Panel](../../assets/images/docs/ams.png)

### [Bluetooth Setup](/docs/guide/bluetooth-setup/)
Enable Bluetooth on Raspberry Pi or BTT Pi when it's disabled for UART, or add a USB Bluetooth dongle when your MCU uses the serial port.

### [Label Printing](/docs/guide/label-printing/)
Print spool labels to Brother QL, Phomemo, Niimbot, or MakeID thermal printers via Network, USB, or Bluetooth. Setup, label sizes, and troubleshooting.

### [Calibration & Tuning](/docs/guide/calibration/)
Bed mesh visualization, screws tilt adjust, input shaper resonance testing, Z-offset calibration, and PID tuning.

![Bed Mesh](../../assets/images/docs/screenshot-bed-mesh-panel.png)

### [Settings](/docs/guide/settings/)
Display, theme, sound, LED, network, sensors, touch calibration, hardware health, safety, machine limits, factory reset, help & support (debug bundles, Discord, docs), and About sub-overlay (version info, updates, branding, contributors).

![Settings](../../assets/images/docs/screenshot-settings-panel.png)

### [Advanced Features](/docs/guide/advanced/)
Console, macro execution, power device control (with home panel quick-toggle and device selection), print history, notification history, and timelapse settings.

### [Beta Features](/docs/guide/beta-features/)
How to enable beta features, the full beta feature list, and update channel selection.

### [Tips & Best Practices](/docs/guide/tips/)
Workflow shortcuts, quick troubleshooting table, and a "which panel do I use?" reference.

---

## Other Resources

- [Troubleshooting](/docs/reference/troubleshooting/) — Solutions to common problems
- [Configuration](/docs/reference/configuration/) — Detailed configuration options
- [FAQ](/docs/reference/faq/) — Frequently asked questions
- [Installation](/docs/installation/) — Installation instructions
- [Upgrading](/docs/upgrading/) — Version upgrade instructions

---

*HelixScreen — Making Klipper accessible through touch*
