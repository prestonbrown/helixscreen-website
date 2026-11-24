---
title: "Tips"
slug: "1.2/guide/tips"
sidebar:
  order: 9
---


---

## Workflow Tips

**Jump to a temperature.** Tap a heater on the Controls panel, or a heater in a Home screen widget, to open its temperature graph with the controls for that heater. See [Temperature](/1.2/guide/temperature/#temperature-graph-screen).

**Home before you move.** The Motion screen's coordinates, the Move tab's positions and **Park** stay grayed out until the printer is homed, and only a home button homes it. Home first with the home bar or the center of the jog pad. See [Motion](/1.2/guide/motion/).

**Check the pre-print options.** Before you tap **Print**, look at the tiles under **PRINT OPTIONS**: bed mesh, gantry leveling, nozzle cleaning and the others each switch on or off for that one print. See [Pre-Print Options](/1.2/guide/printing/#pre-print-options).

**Set your Z-offset on the first layer.** Open **Tune** during a print, make baby-step adjustments while you can see the lines going down, and save afterwards. The adjustment is temporary until you tap **Save Z-Offset** on the Controls panel once the print ends. On printers whose firmware saves the offset itself, there is nothing to save. See [Z-Offset / Baby Steps](/1.2/guide/printing/#z-offset--baby-steps).

**Put your most-used controls on the Home screen.** Long-press the widget grid to enter Edit Mode and add widgets such as Speed / Flow, Z-Offset, the camera or macro buttons. See [Edit Mode](/1.2/guide/home-edit-mode/).

**Start from OrcaSlicer.** OrcaSlicer 2.4.0 or newer can send a sliced file straight to your printer. See [Sending Prints from OrcaSlicer](/1.2/guide/printing/#sending-prints-from-orcaslicer).

---

## Quick Troubleshooting

| Problem | Quick fix |
|---------|-----------|
| Taps land in the wrong spot | **Settings > Touch & Input > Touch Calibration** |
| The screen shows it is disconnected | Check that Moonraker is running and the network is up, then check **Settings > Connection > Host** |
| Temperature does not change | Check that the heater is enabled in your Klipper configuration |
| It will not extrude | Heat the nozzle above your printer's minimum extrusion temperature first |
| Filament slots do not appear | Check that your filament system is set up in Klipper. See [Filament](/1.2/guide/filament/) |

For more, see [Troubleshooting](/1.2/reference/troubleshooting/).

---

## When to Use Which Panel

The [I Want To... table](/1.2/guide/#i-want-to) in the guide overview lists common tasks, where each one is on the screen, and the page that covers it.

---

## Further Reading

- [Troubleshooting](/1.2/reference/troubleshooting/): solutions to common problems
- [Configuration](/1.2/reference/configuration/): detailed configuration options
- [FAQ](/1.2/reference/faq/): frequently asked questions
- [Installation](/1.2/installation/): installation instructions

---

**Prev:** [Beta Features](/1.2/guide/beta-features/) | [Back to User Guide](/1.2/guide/)
