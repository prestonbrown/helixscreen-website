---
title: "User Guide"
slug: "1.2/guide"
sidebar:
  order: 0
---


This guide covers everything you can do from HelixScreen's touchscreen. New to it? Start with [Getting Started](/1.2/guide/getting-started/), which tours the five navigation bar buttons and walks through the setup wizard. Looking for one thing? Find it in the table below or in the [Guide Contents](#guide-contents).

![The Home panel, with the five navigation bar buttons marked](../../../../assets/images/docs/1.2/nav-bar.png)

---

## I Want To...

| I want to... | Where on the screen | Read more |
|--------------|---------------------|-----------|
| Start a print | **Home**, then **Print Files** on the print card | [Printing](/1.2/guide/printing/) |
| Reprint my last file | **Home**, then **Reprint Last** on the print card | [Printing](/1.2/guide/printing/) |
| Pause or cancel a print | The buttons along the bottom of the print screen | [During a Print](/1.2/guide/printing/#during-a-print) |
| Change speed or flow mid-print | **Tune** on the print screen | [Print Tune Overlay](/1.2/guide/printing/#print-tune-overlay) |
| Fix my first layer | **Tune** on the print screen, or **Z-Offset** on **Controls** | [Z Offset](/1.2/guide/z-offset/) |
| Stop printing one failed part | Press and hold the part in the print preview | [Exclude Object](/1.2/guide/printing/#exclude-object) |
| Watch the print on camera | A **Camera** widget, or **Settings > Devices > Camera** | [Camera](/1.2/guide/camera/) |
| Load or unload filament | **Filament** | [Filament Management](/1.2/guide/filament/#load--unload--purge) |
| Load a different slot or tool | **Filament**, then tap the slot | [The Filament System Panel](/1.2/guide/filament-ams-panel/) |
| Dry filament | **Filament**, then the temperature badge on a box, or **Advanced > Dry Filament** | [Filament Drying](/1.2/guide/filament-drying/) |
| Heat the nozzle or bed | **Controls**, or tap a heater on the Home screen | [Temperature Control](/1.2/guide/temperature/) |
| Move or home the print head | **Controls > Motion** | [Motion & Positioning](/1.2/guide/motion/) |
| Level my bed | **Controls > Bed Mesh**, or **Advanced > Calibration > Bed mesh** | [Calibration](/1.2/guide/calibration/#bed-mesh) |
| Tune input shaper | **Advanced > Calibration > Input shaper** | [Calibration](/1.2/guide/calibration/#input-shaper) |
| Run the main calibrations in one go | **Advanced > Calibration > Guided calibration** | [Calibration](/1.2/guide/calibration/#guided-calibration) |
| PID-tune a heater | **Advanced > Calibration > Heaters** | [Calibration](/1.2/guide/calibration/#heater-calibration-pid--mpc) |
| Run a macro | **Advanced > Macro Browser**, or a **Macros** widget | [Advanced Features](/1.2/guide/advanced/#macro-execution) |
| See past prints | **Advanced > Print History** | [Print History](/1.2/guide/print-history/) |
| Record a timelapse | **Settings > Printing > Timelapse** | [Timelapse](/1.2/guide/timelapse/) |
| Rearrange the home screen | Long-press the widget grid | [Edit Mode](/1.2/guide/home-edit-mode/) |
| Change the theme | **Settings > Appearance > Theme Colors** | [Appearance](/1.2/guide/settings/appearance/) |
| Join a Wi-Fi network | **Settings > Connection** | [Connection](/1.2/guide/settings/connection/) |
| Lock the screen with a PIN | **Settings > System > Security** | [Security & Screen Lock](/1.2/guide/security/) |
| Fix taps that land in the wrong spot | **Settings > Touch & Input > Touch Calibration** | [Touch Calibration](/1.2/guide/touch-calibration/) |
| Update HelixScreen | **Settings > Updates** | [Updates](/1.2/guide/settings/updates/) |

Something not working? See [Troubleshooting](/1.2/reference/troubleshooting/) and the [FAQ](/1.2/reference/faq/).

---

## Guide Contents

The guide follows how you use a printer day to day: your home screen, starting a job, watching it, and handling filament come first, then tuning and the things you set up once.

### Getting Started

- **[Getting Started](/1.2/guide/getting-started/)**: navigation, touch gestures, connection status, the first-run setup wizard, WiFi, and the on-screen keyboard.
- **[Supported Printers](/1.2/guide/supported-printers/)**: which printers get model-specific integration and what works on each.
- **[Installation](/1.2/installation/)**: installing HelixScreen on your printer or a Klipper host. To try it without touching the printer, [run it in a window on a Linux desktop](/1.2/guide/install-linux-desktop/).

![Setup Wizard](../../../../assets/images/docs/1.2/wizard-wifi.png)

### Your Home Screen

The home screen is yours to build: pick the widgets, size them, and spread them across pages.

- **[Home Panel](/1.2/guide/home-panel/)**: the status area, the widget grid, multiple pages, and emergency stop.
- **[Edit Mode](/1.2/guide/home-edit-mode/)**: adding, moving, resizing and configuring widgets, and adding pages.
- **[Widget Catalog](/1.2/guide/home-widgets/)**: every widget, with details on the [print](/1.2/guide/home-widgets-print/), [filament](/1.2/guide/home-widgets-filament/), and [control and system](/1.2/guide/home-widgets-controls/) widgets.
- **[Printer Manager](/1.2/guide/printer-manager/)**: your printer's name, model and picture, its software versions, and the hardware HelixScreen found.

### Starting a Print

- **[Choosing and starting a print](/1.2/guide/printing/)**: browsing files, the preview, pre-print options, checking the file fits the printer, queueing, and sending prints from OrcaSlicer.
- **[Filament Mapping](/1.2/guide/filament-mapping/)**: matching each color in a multi-color file to a slot before the print starts.
- **[Print History](/1.2/guide/print-history/)**: past jobs with statistics and trend charts, and reprinting a previous job.

![Print File Detail](../../../../assets/images/docs/1.2/print-detail.png)

### Watching the Current Print

- **[During a print](/1.2/guide/printing/#during-a-print)**: progress, pausing at a layer, the tune overlay, Z-offset baby steps, excluding a failed object, the post-print summary, and resuming after a power loss.
- **[Z Offset by Material](/1.2/guide/z-offset-by-material/)**: a separate first-layer offset and bed mesh for each material, applied at every print start and saved per material.
- **[Print Monitoring & Failure Detection](/1.2/guide/print-monitoring/)**: the pre-print filament check and the response to camera-based failure detection.
- **[Camera](/1.2/guide/camera/)**: the camera widget and the fullscreen viewer.
- **[Screen Sharing and Remote Control](/1.2/guide/screen-sharing/)**: seeing and using the printer's screen from any browser, or as a webcam in Mainsail and Fluidd.

### Filament

- **[Filament Management](/1.2/guide/filament/)**: load, unload and purge, extrusion controls, the external spool, and running more than one filament system.
- **[The Filament System Panel](/1.2/guide/filament-ams-panel/)**: slots, lanes, and per-unit controls for AMS-style systems (AFC, Happy Hare, ACE, IFS, QIDI Box, OpenAMS, and more).
- **[Creality Filament System (CFS)](/1.2/guide/filament-cfs/)** and **[Snapmaker U1 and MedusaHC](/1.2/guide/filament-tool-changers/)**: what is specific to those systems.
- **[Filament Drying and Humidity](/1.2/guide/filament-drying/)**: per-unit drying controls and humidity monitoring.
- **[Filament Tracking & Spoolman](/1.2/guide/filament-tracking/)**: how material, color and remaining weight are tracked, with the built-in tracker or a Spoolman server.

![AMS Panel](../../../../assets/images/docs/1.2/ams.png)

### Printer Control

- **[Temperature Control](/1.2/guide/temperature/)**: nozzle, bed and chamber targets, material presets, multiple extruders, and live graphs.
- **[Motion & Positioning](/1.2/guide/motion/)**: jogging, homing, tap-to-move, the bed map, parking, and emergency stop.
- **[Fans](/1.2/guide/fans/)**: speed control, RPM readouts, and renaming fans.
- **[Advanced Features](/1.2/guide/advanced/)**: the G-code console, macros, interactive prompts, power devices, notification history, and timelapse.
- **[Timelapse](/1.2/guide/timelapse/)**: Layer and Hyperlapse modes, the slicer line Layer mode needs, parking, and the No Timelapse Frames warning.

![Motion Controls](../../../../assets/images/docs/1.2/screenshot-motion-panel.png)

### Tuning & Calibration

- **[Calibration & Tuning](/1.2/guide/calibration/)**: bed mesh, screws tilt adjust, input shaper, Z-offset, tool offsets, belt tension, pressure advance, and PID tuning.
- **[Z Offset](/1.2/guide/z-offset/)**: what it is, calibrating it for each probe type, baby steps, what Save does, firmware-managed printers, per-tool offsets, and the gotchas.

![Bed Mesh](../../../../assets/images/docs/1.2/screenshot-bed-mesh-panel.png)

### Settings & Setup

- **[Settings](/1.2/guide/settings/)**: display, appearance and themes, touch, sound, printing, devices, safety, connection, language, updates, and more.
- **[Sensors](/1.2/guide/sensors/)**: filament runout and motion sensors, door and button inputs, and read-only sensors.
- **[Security & Screen Lock](/1.2/guide/security/)**: PIN lock, auto-lock, and what a factory reset clears.
- **[Touch Calibration](/1.2/guide/touch-calibration/)**: fixing taps that land in the wrong spot.
- **[HelixPrint Plugin](/1.2/guide/helixprint-plugin/)**: the optional Moonraker add-on, what it adds, and what works without it.
- **[Add-On Chamber Heater Setup](/1.2/guide/chamber-heater/)**: getting a BIGTREETECH Panda Breath working with Klipper.
- **[Bluetooth Setup](/1.2/guide/bluetooth-setup/)**: enabling Bluetooth on a Pi or BTT Pi, or adding a USB dongle.
- **[Barcode Scanner](/1.2/guide/barcode-scanner/)**: reading Spoolman QR codes with a USB or Bluetooth scanner.
- **[Label Printing](/1.2/guide/label-printing/)**: printing spool labels on Brother QL, Phomemo, Niimbot, or MakeID printers.

### More

- **[Tips & Best Practices](/1.2/guide/tips/)**: shortcuts, quick troubleshooting, and which panel to use for what.
- **[Beta Features](/1.2/guide/beta-features/)**: turning on beta features and choosing an update channel.
- **[Troubleshooting](/1.2/reference/troubleshooting/)**, **[FAQ](/1.2/reference/faq/)**, **[Configuration](/1.2/reference/configuration/)**, and **[Upgrading](/1.2/upgrading/)**.
- **[Creality K1C Setup](/1.2/guide/creality-k1c-setup/)**: rooting, community firmware, and installing HelixScreen on a K1, K1C or K1 Max.

---

*HelixScreen — Making Klipper accessible through touch*
