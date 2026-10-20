// Mirrors the exact stylelint config Obsidian's community theme review runs
// (the "CSS LINT" panel on a theme submission PR), reproduced from
// obsidianmd/obsidian-workflows `SCANNER_STYLELINT_CONFIG` + `getMinElectronVersion`
// (src/lint.ts, commit b73148d, tag v1.2.3):
// https://github.com/obsidianmd/obsidian-workflows/blob/v1.2.3/src/lint.ts
//
// Deliberately NOT `extends: "stylelint-config-obsidianmd"` or
// "stylelint-config-standard": the review scanner itself only ever applies
// these rules with no base config, so the stylistic rules a full
// `stylelint-config-standard` extend would add (selector-class-pattern,
// no-descending-specificity, property-no-vendor-prefix, etc.) are never part
// of what the review surfaces. This repo's own house-style lint
// (`npm run lint:css`, `.stylelintrc.json`) is a separate, stricter check.
//
// The review derives its minimum supported Electron version from the
// theme's manifest.json `minAppVersion`, which changes which CSS features
// `plugin/no-unsupported-browser-features` flags. Recompute it the same way
// the scanner does instead of hard-coding it, so this config tracks
// manifest.json automatically.

const fs = require("node:fs");
const path = require("node:path");

// Source: obsidianmd/obsidian-workflows src/lint.ts ELECTRON_VERSIONS
const ELECTRON_VERSIONS = {
  25: "1.4.5",
  28: "1.5.8",
  30: "1.6.5",
  31: "1.7.4",
  37: "1.9.12",
  39: "1.11.4",
};
const DEFAULT_ELECTRON = 39;

function semverToNum(v) {
  const [major = 0, minor = 0, patch = 0] = v.split(".").map(Number);
  return major * 100_000 + minor * 1_000 + patch;
}

function getMinElectronVersion(minAppVersion) {
  if (!minAppVersion) return DEFAULT_ELECTRON;

  const target = semverToNum(minAppVersion);
  let result = Math.min(...Object.keys(ELECTRON_VERSIONS).map(Number));

  for (const [electronStr, obsidianVersion] of Object.entries(ELECTRON_VERSIONS)) {
    const electron = Number(electronStr);
    if (semverToNum(obsidianVersion) <= target) {
      result = Math.max(result, electron);
    }
  }

  return result;
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8"),
);
const minElectron = getMinElectronVersion(manifest.minAppVersion);

module.exports = {
  plugins: ["stylelint-no-unsupported-browser-features"],
  ignoreDisables: true,
  rules: {
    "function-url-scheme-disallowed-list": [
      ["http", "https", "file"],
      {
        severity: "error",
        message:
          "External URLs are not allowed in themes. To embed images & fonts encode them as base64 <https://docs.obsidian.md/Themes/App+themes/Embed+fonts+and+images+in+your+theme>",
      },
    ],
    "function-url-scheme-allowed-list": ["data"],
    "declaration-no-important": [
      true,
      {
        severity: "warning",
        message:
          "Avoid !important — override styles by increasing selector specificity or using CSS variables instead.",
      },
    ],
    "color-named": [
      "never",
      {
        severity: "warning",
        message:
          "Use hex colors or Obsidian CSS variables instead of named colors to ensure proper light/dark theme support. <https://docs.obsidian.md/Reference/CSS+variables/CSS+variables>",
      },
    ],
    "custom-property-no-missing-var-function": null,
    "no-duplicate-selectors": null,
    "no-duplicate-at-import-rules": null,
    "declaration-block-no-duplicate-properties": [true, { severity: "warning" }],
    "shorthand-property-no-redundant-values": null,
    "plugin/no-unsupported-browser-features": [
      true,
      {
        severity: "warning",
        browsers: [`electron >= ${minElectron}`],
        ignore: ["css-nesting", "css-cascade-layers"],
      },
    ],
    "selector-pseudo-class-disallowed-list": [
      ["has"],
      {
        severity: "warning",
        message:
          "Avoid :has() — it can cause significant performance issues due to broad selector invalidation.",
      },
    ],
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["global", "local"], severity: "warning" },
    ],
    "selector-pseudo-element-no-unknown": [true, { severity: "warning" }],
    "selector-type-no-unknown": [true, { ignoreTypes: [], severity: "warning" }],
    "at-rule-no-unknown": [
      true,
      { ignoreAtRules: ["layer", "property", "container"], severity: "warning" },
    ],
    "unit-no-unknown": [true, { severity: "warning" }],
    "property-disallowed-list": [["all"], { severity: "warning" }],
  },
};
