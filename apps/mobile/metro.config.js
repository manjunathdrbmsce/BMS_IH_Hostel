// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the monorepo root (two levels up from apps/mobile)
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// ── 1. watchFolders ───────────────────────────────────────────────
// Only watch directories that contain *source* code the mobile app
// imports.  Do NOT add node_modules or the monorepo root:
//   • Metro already watches the project dir (apps/mobile) automatically.
//   • Adding root node_modules causes the FallbackWatcher on Windows to
//     walk into broken .gradle / build artefact directories created by
//     `expo run:android`, crashing with ENOENT on fs.watch().
//   • Resolution (imports) still works via nodeModulesPaths below;
//     watching is only needed for hot-reload of source code edits.
config.watchFolders = [
    path.resolve(monorepoRoot, 'packages'),
];

// ── 2. resolver.nodeModulesPaths ──────────────────────────────────
// Metro uses these to *resolve* require/import statements.
// Both the local and hoisted node_modules are needed in a monorepo.
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
];

// ── 3. resolver.blockList ─────────────────────────────────────────
// Patterns Metro should never try to resolve, even if reachable.
config.resolver.blockList = [
    /apps[/\\]api[/\\].*/,
    /apps[/\\]web[/\\].*/,
    /\.gradle[/\\].*/,
    /android[/\\]build[/\\].*/,
    /android[/\\]app[/\\]build[/\\].*/,
    /node_modules[/\\].*gradle-plugin[/\\].*/,
    /node_modules[/\\].*[/\\]android[/\\]build[/\\].*/,
    /test-app[/\\].*/,
];

// ── 4. Windows watcher hardening ──────────────────────────────────
if (process.platform === 'win32') {
    config.watcher = {
        ...config.watcher,
        watchman: { deferStates: ['hg.update'] },
        healthCheck: {
            enabled: true,
            interval: 60000,
            timeout: 120000,
            filePrefix: '.metro-health-check',
        },
    };
}

module.exports = config;
