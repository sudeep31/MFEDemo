/**
 * MFE Registry — runtime helper consumed by the shell.
 * All configuration is read from mfe.manifest.json so the shell
 * never contains hardcoded URLs or port numbers.
 */
const manifest = require("../../mfe.manifest.json");

const registry = manifest.remotes;

/** All active remotes as a flat array */
function getActiveRemotes() {
  return Object.entries(registry)
    .filter(([, cfg]) => cfg.active)
    .map(([key, cfg]) => ({ key, ...cfg }));
}

/** Single remote by key */
function getRemote(key) {
  return registry[key] ? { key, ...registry[key] } : null;
}

module.exports = { registry, getActiveRemotes, getRemote };
