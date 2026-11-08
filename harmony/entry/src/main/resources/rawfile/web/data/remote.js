/*
 * Remote risk-data endpoint used for daily in-app updates.
 *
 * Leave empty to use only the data bundled in this build.
 *
 * To let the installed app update itself every day without reinstalling the
 * HAP, publish the `web/data/` folder on any HTTPS static host (GitHub Pages,
 * OSS, your own server) and put its base URL here, for example:
 *
 *   window.__REMOTE_DATA__ = 'https://example.com/readytogo/data/';
 *
 * The host must allow cross-origin GET (Access-Control-Allow-Origin: *).
 * The app fetches risk.json + countries.geojson at launch, at 00:00 local
 * time, and when returning to the foreground, caching the result offline.
 */
window.__REMOTE_DATA__ = 'https://2812458340-ops.github.io/ReadyToGo/data/';
