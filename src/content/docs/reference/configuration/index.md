---
title: "Configuration"
sidebar:
  order: 1
---


HelixScreen keeps all of its settings in one file, `settings.json`. You can change nearly every setting from the touchscreen, under **Settings**, and that is the safest way. This reference is for the times you want to read the file, edit it, or understand what a value does. Each page covers one area, lists every key with its default, and names the menu row that sets it.

The pages are:

| Page | What it covers |
|------|----------------|
| [The Settings File](/reference/configuration/settings-file/) | Where `settings.json` lives on each platform, how it is organised, resetting it, backups and recovery, and why safety limits are not in it |
| [Display, Language and Time](/reference/configuration/display/) | Brightness, dimming, sleep, screensaver, rotation, UI scale, screen layout, language, clock and time zone |
| [Appearance and Previews](/reference/configuration/appearance/) | Dark mode, themes, animations, glass effects, toolhead style, G-code preview, bed mesh view, G-code viewer tuning, spool picture |
| [Touch and Input](/reference/configuration/input/) | Scrolling feel, long press, number pad, Scroll Guard, touch calibration, keyboards, barcode scanner |
| [Sound](/reference/configuration/sound/) | Sound switches, volume, sound themes, sound card and PWM buzzer |
| [Printer Hardware and Motion](/reference/configuration/printer/) | Printer name and type, heaters, sensors, fans, enclosure, motion and jog settings, Z-offset, capability overrides, macro buttons, cooldown |
| [Lights (LEDs)](/reference/configuration/leds/) | LED startup, remembered colours, automatic lighting by printer state, macro devices |
| [Filament, Multi-Filament Systems and Sensors](/reference/configuration/filament/) | Load and unload behaviour, cooldown after filament changes, multi-filament system options, favourites, filament sensors |
| [Safety, Alerts and Screen Lock](/reference/configuration/safety-alerts/) | Confirmations, cancel escalation, failure detection, print completion alert, toasts, PIN lock |
| [Printer and Connection](/reference/configuration/network/) | Several printers, the Moonraker address and API key, Wi-Fi, screen sharing, the printer switcher |
| [Home Screen Layout](/reference/configuration/home-panel/) | How pages and widgets are stored, widget settings, every widget id |
| [Label Printer](/reference/configuration/label-printer/) | Network, USB and Bluetooth label printers |
| [Logging, Updates, Telemetry and Storage](/reference/configuration/system/) | Log level and destination, update channel and server addresses, update reminders, telemetry, thumbnail cache |
| [Command Line and Environment Variables](/reference/configuration/environment/) | `helix-screen` options and the variables `helixscreen.env` reads |

## Per screen and per printer

The file holds two kinds of setting. **Per screen** settings describe the touchscreen and the app: brightness, theme, sounds, language. **Per printer** settings describe one machine and live under `printers`, in an entry named after that printer: its address, heaters, fans, lights and Home screen layout. Every page marks which kind each key is. [The Settings File](/reference/configuration/settings-file/#how-the-file-is-organised) explains the layout.

## Before you edit by hand

- Stop HelixScreen first. It rewrites the file while it runs.
- Keep a copy of `settings.json` so you can go back.
- A mistake in the JSON is not fatal. HelixScreen sets the broken file aside as `settings.json.corrupt` and restores its most recent backup, or starts from defaults when there is none. See [Safety and recovery](/reference/configuration/settings-file/#safety-and-recovery).
- Looking for a walkthrough of each screen instead? See [Display](/guide/settings/display/), [Appearance](/guide/settings/appearance/), [Touch & Input](/guide/settings/touch-input/), [Sound](/guide/settings/sound/), [Printing](/guide/settings/printing/), [Devices](/guide/settings/devices/), [LED Settings](/guide/settings/led-settings/), [Safety & Alerts](/guide/settings/safety/), [Connection](/guide/settings/connection/), [Language & Time](/guide/settings/language-time/), [System](/guide/settings/system/), [Updates](/guide/settings/updates/) and [Help & About](/guide/settings/help-about/).

## Find a setting

| Setting | Scope | Where |
|---|---|---|
| <a id="name"></a>`name` (now `printer_name`) | Per printer | [printer](/reference/configuration/printer/#identity) |
| <a id="moonraker_api_key"></a>`moonraker_api_key` | Per printer | [network](/reference/configuration/network/#moonraker-connection) |
| <a id="moonraker_connection_timeout_ms"></a>`moonraker_connection_timeout_ms` and the other `moonraker_*_ms` timings | Per printer | [network](/reference/configuration/network/#timing) |
| <a id="cooldown_delay_seconds"></a>`cooldown_delay_seconds` | Per printer | [filament](/reference/configuration/filament/#loading-unloading-and-cooldown) |
| <a id="default_macros"></a>`default_macros` | Per printer | [printer](/reference/configuration/printer/#cooldown) |
| <a id="log_dest"></a>`log_dest`, `log_path`, `log_level` | Per screen | [system](/reference/configuration/system/#logging) |
| <a id="print_status_show_camera"></a>`print_status_show_camera` | Per screen | [appearance](/reference/configuration/appearance/#printer-visuals) |
| `dark_mode`, `display.theme`, `display.animations_enabled`, `display.glass_effects`, `appearance.show_widget_labels` | Per screen | [appearance](/reference/configuration/appearance/) |
| `appearance.toolhead_style`, `z_movement_style`, `display.gcode_render_mode`, `display.bed_mesh_render_mode`, `printer_image` | Mixed (see page) | [appearance](/reference/configuration/appearance/#printer-visuals) |
| `gcode_viewer.*`, `streaming.*` | Per screen | [appearance](/reference/configuration/appearance/#g-code-viewer-tuning) |
| `brightness`, `display.sleep_sec`, `display.dim_sec`, `display.dim_brightness`, `display.sleep_while_printing`, `display.screensaver_type` | Per screen | [display](/reference/configuration/display/) |
| `display.rotate`, `display.ui_scale_percent`, `display.layout`, `display.drm_device`, `display.panel_power_off`, backlight keys | Per screen | [display](/reference/configuration/display/#rotation-size-and-layout) |
| `language`, `display.time_format`, `display.timezone` | Per screen | [display](/reference/configuration/display/#language-clock-and-time-zone) |
| `input.*`, touch calibration, `device_blacklist`, `scanner.*`, `display.page_scroll_buttons` | Per screen | [input](/reference/configuration/input/) |
| `sounds_enabled`, `ui_sounds_enabled`, `sounds.volume`, `sound_theme`, `disable_sound`, `sound.output_device`, `sound.pwm_channel` | Per screen | [sound](/reference/configuration/sound/) |
| `heaters.*`, `temp_sensors.*`, `fans.*`, `enclosure_style`, `motion.*`, `z_offset.*` | Per printer | [printer](/reference/configuration/printer/) |
| `capability_overrides.*`, `standard_macros.*`, `extra_sensors`, `hardware` | Per printer (`standard_macros` per screen) | [printer](/reference/configuration/printer/) |
| `leds.*` (startup, colours, auto state, macro devices) | Per printer | [leds](/reference/configuration/leds/) |
| `filament.*`, `ams.*`, `filament_sensors`, `preset_materials` | Per printer (spool style and favourites per screen) | [filament](/reference/configuration/filament/) |
| `safety.*`, `detection.*`, `completion_alert`, `notifications.*`, `security.*` | Per screen (`detection.policy_u1` per printer) | [safety-alerts](/reference/configuration/safety-alerts/) |
| `moonraker_*`, `wifi_*`, `remote_screen.*`, `printers.show_printer_switcher`, `active_printer_id` | Per printer or per screen (see page) | [network](/reference/configuration/network/) |
| `label_printer.*` | Per screen | [label-printer](/reference/configuration/label-printer/) |
| `cache.*`, `update.*`, `upgrade_nudge.*`, `telemetry_enabled`, `beta_features` | Per screen | [system](/reference/configuration/system/) |
| `panel_widgets` (Home screen layout and widget ids) | Per printer | [home-panel](/reference/configuration/home-panel/) |
| Command-line options and environment variables |  | [environment](/reference/configuration/environment/) |

## Where the old sections went

Earlier versions of this page held everything in one long list. If you followed a link to one of these sections, it now lives here.

| Old section | Now |
|---|---|
| <a id="configuration-file-location"></a>Configuration File Location | [settings-file](/reference/configuration/settings-file/#where-the-file-lives) |
| <a id="configuration-structure"></a>Configuration Structure | [settings-file](/reference/configuration/settings-file/#how-the-file-is-organised) |
| <a id="multi-printer-configuration"></a>Multi-Printer Configuration | [network](/reference/configuration/network/#several-printers) |
| <a id="display-settings"></a>Display Settings | [display](/reference/configuration/display/) |
| <a id="input-settings"></a>Input Settings | [input](/reference/configuration/input/) |
| <a id="sound-output"></a>Sound Output | [sound](/reference/configuration/sound/#where-sound-goes) |
| <a id="capability-overrides"></a>Capability Overrides | [printer](/reference/configuration/printer/#capability-overrides) |

<div style="display:none"><a id="dark_mode"></a><a id="brightness"></a><a id="sounds_enabled"></a><a id="ui_sounds_enabled"></a><a id="sound_theme"></a><a id="completion_alert"></a><a id="disable_sound"></a><a id="wizard_completed"></a><a id="wifi_expected"></a><a id="wifi_country"></a><a id="wifi_country_last_seen"></a><a id="language"></a><a id="beta_features"></a><a id="sound-settings"></a><a id="soundsvolume"></a><a id="soundoutput_device"></a><a id="soundpwm_channel"></a><a id="theme-settings"></a><a id="preset"></a><a id="logging-settings"></a><a id="log_path"></a><a id="log_level"></a><a id="animations_enabled"></a><a id="glass_effects"></a><a id="time_format"></a><a id="timezone"></a><a id="theme"></a><a id="layout"></a><a id="rotate"></a><a id="rotation_probed"></a><a id="sleep_sec"></a><a id="sleep_while_printing"></a><a id="dim_sec"></a><a id="dim_brightness"></a><a id="sleep_backlight_off"></a><a id="backlight_enable_ioctl"></a><a id="backlight_floor_percent"></a><a id="panel_power_off"></a><a id="screensaver_type"></a><a id="screensaver_levels"></a><a id="drm_device"></a><a id="gcode_render_mode"></a><a id="gcode_3d_enabled"></a><a id="bed_mesh_render_mode"></a><a id="bed_mesh_show_zero_plane"></a><a id="page_scroll_buttons"></a><a id="speed_flow_physical_units"></a><a id="ui_scale_percent"></a><a id="printer_image"></a><a id="calibration"></a><a id="appearance-settings"></a><a id="toolhead_style"></a><a id="show_widget_labels"></a><a id="scroll_throw"></a><a id="scroll_limit"></a><a id="long_press_time"></a><a id="home_edit_mode_enabled"></a><a id="keypad_layout"></a><a id="touch_device"></a><a id="device_blacklist"></a><a id="scroll_guard"></a><a id="force_calibration"></a><a id="motion-settings"></a><a id="jog_speed_xy"></a><a id="jog_speed_z"></a><a id="fine_inner"></a><a id="fine_outer"></a><a id="coarse_inner"></a><a id="coarse_outer"></a><a id="turbo_inner"></a><a id="turbo_outer"></a><a id="show_actual_position"></a><a id="output-settings"></a><a id="led_on_at_start"></a><a id="network-settings"></a><a id="printer-settings"></a><a id="type"></a><a id="heatershotend"></a><a id="heatersbed"></a><a id="temp_sensorshotend"></a><a id="temp_sensorsbed"></a><a id="fanspart"></a><a id="fanshotend"></a><a id="fanschamber"></a><a id="fansexhaust"></a><a id="heaterschamber"></a><a id="temp_sensorschamber"></a><a id="enclosure_style"></a><a id="z_offsetstep_index"></a><a id="z_offsetsave_mode"></a><a id="led-settings"></a><a id="ledsstrip"></a><a id="ledsselected_strips"></a><a id="ledslight_button_pending"></a><a id="ledsled_on_at_start"></a><a id="ledsstartup_brightness"></a><a id="ledslast_color"></a><a id="ledslast_brightness"></a><a id="ledscolor_presets"></a><a id="ledsauto_state"></a><a id="ledsmacro_devices"></a><a id="extra_sensors"></a><a id="hardware"></a><a id="moonraker-settings"></a><a id="moonraker_host"></a><a id="moonraker_port"></a><a id="moonraker_request_timeout_ms"></a><a id="moonraker_keepalive_interval_ms"></a><a id="moonraker_reconnect_min_delay_ms"></a><a id="moonraker_reconnect_max_delay_ms"></a><a id="moonraker_timeout_check_interval_ms"></a><a id="standard-macros-quick-action-buttons"></a><a id="quick_button_1"></a><a id="quick_button_4"></a><a id="load_filament"></a><a id="unload_filament"></a><a id="purge"></a><a id="pause"></a><a id="resume"></a><a id="cancel"></a><a id="bed_mesh"></a><a id="bed_level"></a><a id="clean_nozzle"></a><a id="heat_soak"></a><a id="g-code-viewer-settings"></a><a id="tube_sides"></a><a id="streaming_mode"></a><a id="streaming_threshold_percent"></a><a id="layers_per_frame"></a><a id="adaptive_layer_target_ms"></a><a id="ams-settings"></a><a id="spool_style"></a><a id="per-printer-ams-settings"></a><a id="force_bypass_controls"></a><a id="always_show_bypass_spool"></a><a id="keep_spool_info_on_eject"></a><a id="tag_links_spoolman"></a><a id="unload_after_print"></a><a id="panel-widget-settings"></a><a id="panel_widgetshome"></a><a id="cache-settings"></a><a id="thumbnail_max_mb"></a><a id="disk_critical_mb"></a><a id="disk_low_mb"></a><a id="streaming-settings"></a><a id="threshold_mb"></a><a id="force_streaming"></a><a id="safety-settings"></a><a id="estop_require_confirmation"></a><a id="cancel_escalation_enabled"></a><a id="cancel_escalation_timeout_seconds"></a><a id="tool_change_require_confirmation"></a><a id="notification-settings"></a><a id="min_toast_severity"></a><a id="filament-settings"></a><a id="auto_cooldown"></a><a id="favorite_ids"></a><a id="filament-sensor-settings"></a><a id="master_enabled"></a><a id="sensors"></a><a id="security-settings"></a><a id="securitypin_hash"></a><a id="securityauto_lock"></a><a id="screen-sharing-settings"></a><a id="remote_screenenabled"></a><a id="remote_screencontrol"></a><a id="remote_screenport"></a><a id="label-printer-settings"></a><a id="address"></a><a id="port"></a><a id="protocol"></a><a id="label_size"></a><a id="label_count"></a><a id="usb_vid"></a><a id="usb_pid"></a><a id="usb_serial"></a><a id="bt_address"></a><a id="bt_name"></a><a id="bt_transport"></a><a id="printer-switcher"></a><a id="printersshow_printer_switcher"></a><a id="telemetry-settings"></a><a id="telemetry_enabled"></a><a id="update-settings"></a><a id="channel"></a><a id="dev_url"></a><a id="r2_url"></a><a id="upgrade-nudge"></a><a id="upgrade_nudgeintensity"></a><a id="upgrade_nudgedismissed_version"></a><a id="safety-limits"></a><a id="resetting-configuration"></a><a id="full-reset"></a><a id="partial-reset"></a><a id="config-safety--recovery"></a><a id="atomic-saves"></a><a id="corruption-detection"></a><a id="rolling-backups"></a><a id="recovery-steps"></a><a id="if-you-have-a-helixconfigjson"></a><a id="command-line-options"></a><a id="display-options"></a><a id="navigation-options"></a><a id="connection-options"></a><a id="logging-options"></a><a id="debugging-options"></a><a id="utility-options"></a><a id="examples"></a><a id="environment-variables"></a><a id="example-complete-configuration"></a></div>

---

*Back to: [User Guide](/guide/) | [Troubleshooting](/reference/troubleshooting/)*
