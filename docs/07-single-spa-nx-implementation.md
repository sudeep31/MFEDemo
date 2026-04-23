# single-spa + Nx — Complete Implementation Guide

**Part of the MFEDemo architecture series**
**Repository: https://github.com/sudeep31/MFEDemo**

> This document covers the step-by-step implementation of single-spa in the MFEDemo Nx monorepo, including how to configure the polyrepo `angularTodo` MFE. For the architectural decision of _when_ to use single-spa vs Web Components, refer to the [LinkedIn article](./linkedin-mfe-article.md).

---

## What single-spa Does

single-spa is a **framework-agnostic orchestration layer**. Instead of each MFE being loaded by a React shell (which is framework-specific), single-spa provides a Root Config that speaks a universal lifecycle protocol:

```
bootstrap()   ← called once on first load
mount()       ← called when the user navigates to this MFE's route
unmount()     ← called when the user navigates away
```

Every framework (React, Angular, Vue, Vanilla JS) has an adapter that implements these three functions. The Root Config does not know or care which framework is behind each MFE.

**When to introduce single-spa:**

| MFE Count    | Recommended Setup                                         |
| ------------ | --------------------------------------------------------- |
| 1 – 20 MFEs  | Web Component + `mfe.manifest.json` (simpler, fewer deps) |
| 20 – 50 MFEs | single-spa + Nx (lifecycle management becomes valuable)   |
| 50+ MFEs     | single-spa + Nx import maps (full orchestration at scale) |

---

## Prerequisites

- Nx workspace initialised at `C:\MFEDemo` (`nx.json` + root `package.json`)
- At least one MFE running (React on `:3001`, Angular on `:4201`, etc.)
- Node 20+, npm 10+

---

## Step 1 — Install single-spa in the Nx Workspace

```bash
# From the root of the MFEDemo Nx workspace (C:\MFEDemo)
npm install single-spa

# Framework-specific adapters
npm install single-spa-react       # for React shell and React MFEs
npm install single-spa-angular     # for Angular MFEs (monorepo)
npm install single-spa-vue         # for Vue MFEs (if needed)

# Developer tooling — lets you swap MFE URLs in the browser without rebuilding
npm install import-map-overrides
```

---

## Step 2 — Create the Root Config Application

In an Nx monorepo, the Root Config is a new application. Generate it:

```bash
nx generate @nx/web:application root-config --directory=apps/root-config
```

The Root Config is a minimal vanilla JS file that reads the same `mfe.manifest.json` already used by the Webpack shell — **no new registry format needed**:

```javascript
// apps/root-config/src/root-config.js
import { registerApplication, start } from "single-spa";
import manifest from "../../mfe.manifest.json";

// Register every active MFE from the manifest
Object.entries(manifest).forEach(([name, config]) => {
  if (!config.active) return;

  registerApplication({
    name,
    // Each MFE exposes a System.register bundle at its remoteEntry URL
    app: () => System.import(config.remoteEntry),
    // single-spa activates this MFE when the URL matches the configured route
    activeWhen: (location) => location.pathname.startsWith(config.route),
  });
});

start({ urlRerouteOnly: true });
```

> **Key point:** The Root Config reads the same `mfe.manifest.json` used by the existing Webpack shell. The single source of truth does not change — only the loading mechanism changes (Webpack Module Federation → SystemJS import maps).

---

## Step 3 — Set Up SystemJS Import Maps

single-spa uses **SystemJS import maps** to resolve MFE URLs at runtime. Create `importmap.json` in the root config public folder:

```json
// apps/root-config/public/importmap.json
{
  "imports": {
    "single-spa": "https://cdn.jsdelivr.net/npm/single-spa@6.0.0/lib/system/single-spa.min.js",
    "react": "https://cdn.jsdelivr.net/npm/react@19/umd/react.production.min.js",
    "react-dom": "https://cdn.jsdelivr.net/npm/react-dom@19/umd/react-dom.production.min.js",
    "@mfe/react-app": "http://localhost:3001/main.js",
    "@mfe/vue-app": "http://localhost:3002/main.js",
    "@mfe/angular-app": "http://localhost:4201/main.js",
    "@mfe/angular-todo": "http://localhost:4200/main.js"
  }
}
```

Reference it in the Root Config HTML entry point:

```html
<!-- apps/root-config/public/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>MFEDemo — Root Config</title>

    <!-- SystemJS import map — resolves all MFE and shared lib URLs -->
    <script type="systemjs-importmap" src="/importmap.json"></script>

    <!-- SystemJS runtime -->
    <script src="https://cdn.jsdelivr.net/npm/systemjs/dist/system.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/systemjs/dist/extras/amd.min.js"></script>

    <!-- import-map-overrides DevTools (dev only) -->
    <script src="https://cdn.jsdelivr.net/npm/import-map-overrides/dist/import-map-overrides.js"></script>
  </head>
  <body>
    <!-- single-spa mounts each MFE into this container -->
    <div id="root"></div>
    <import-map-overrides-full
      show-when-local-storage="devtools"
    ></import-map-overrides-full>

    <!-- Root Config bootstrap -->
    <script src="/root-config.js" type="module"></script>
  </body>
</html>
```

---

## Step 4 — Adapt Each Monorepo MFE to Export single-spa Lifecycles

Each MFE must export the three lifecycle functions. The framework adapters do this automatically.

### React MFE (`mfe-react-app`)

```javascript
// mfe-react-app/src/mfe-lifecycle.js
import React from "react";
import ReactDOM from "react-dom";
import singleSpaReact from "single-spa-react";
import App from "./App";

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err, info, props) {
    return <div>React MFE failed to load: {err.message}</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
```

Update `webpack.config.js` in `mfe-react-app` to output a SystemJS bundle:

```javascript
// mfe-react-app/webpack.config.js
module.exports = {
  output: {
    libraryTarget: "system", // <-- single-spa requires SystemJS format
    filename: "main.js",
    publicPath: "http://localhost:3001/",
  },
  externals: ["react", "react-dom", "single-spa"], // loaded from import map
};
```

### Angular MFE (`mfe-angular-app` — monorepo)

The Angular MFE already uses `@angular-architects/native-federation`. To also support single-spa, add a dedicated single-spa entry point:

```bash
# In mfe-angular-app
npm install single-spa-angular
ng add single-spa-angular --project=mfe-angular-app
```

This generates `src/main.single-spa.ts`:

```typescript
// mfe-angular-app/src/main.single-spa.ts
import { singleSpaAngular } from "single-spa-angular";
import { platformBrowser } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { App } from "./app/app";
import { Router } from "@angular/router";
import { NgZone } from "@angular/core";

const lifecycles = singleSpaAngular({
  bootstrapFunction: () =>
    platformBrowser().bootstrapModule(/* standalone */ App as any, {
      providers: appConfig.providers,
    }),
  template: "<mfe-angular-root />",
  Router,
  NgZone,
});

export const { bootstrap, mount, unmount } = lifecycles;
```

> **Note:** The existing `main-mfe.ts` (Web Component bootstrap) is kept as-is. The single-spa entry point is a separate file — the two approaches coexist.

### Vue MFE (`mfe-vue-app`)

```javascript
// mfe-vue-app/src/mfe-lifecycle.js
import singleSpaVue from "single-spa-vue";
import { createApp, h } from "vue";
import App from "./App.vue";

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App);
    },
  },
});

export const { bootstrap, mount, unmount } = vueLifecycles;
```

---

## Step 5 — Add Nx Project Targets for single-spa

Add a `build:spa` target to each MFE's `project.json` so Nx can orchestrate single-spa builds independently from the existing Webpack MF builds:

```json
// apps/mfe-react-app/project.json
{
  "targets": {
    "build": { "...existing webpack-mf build..." },
    "serve": { "...existing serve..." },
    "build:spa": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "outputPath": "dist/mfe-react-app-spa",
        "webpackConfig": "apps/mfe-react-app/webpack.spa.config.js"
      }
    },
    "serve:spa": {
      "executor": "@nx/webpack:dev-server",
      "options": {
        "buildTarget": "mfe-react-app:build:spa",
        "port": 3001
      }
    }
  }
}
```

Build and serve all MFEs for single-spa with Nx:

```bash
# Build all MFEs
nx run-many --target=build:spa --all

# Build only what changed since last commit
nx affected --target=build:spa

# Serve all MFEs in parallel (development)
nx run-many --target=serve:spa --all --parallel
```

---

## Step 6 — Configuring the Polyrepo `angularTodo` with single-spa

The `angularTodo` app lives at `C:\AngularToDO\angularTodo` — a completely separate repo and workspace. There are two integration options.

### Option A — Web Component (current approach, no changes needed) ✅

The existing `bootstrap-mfe.ts` already registers `<angular-todo-app>` as a custom element. The Root Config wraps it with a thin single-spa lifecycle — **zero changes to the `angularTodo` repo**:

```javascript
// apps/root-config/src/root-config.js — polyrepo Angular Todo via Web Component
import { registerApplication, start } from "single-spa";

registerApplication({
  name: "@mfe/angular-todo",
  app: async () => {
    // Load the script tag — Angular bootstraps and self-registers <angular-todo-app>
    await import("http://localhost:4200/main.js");
    await customElements.whenDefined("angular-todo-app");

    // Return a minimal single-spa lifecycle that wraps the custom element
    return {
      bootstrap: async () => {},
      mount: async (props) => {
        const el = document.createElement("angular-todo-app");
        props.domElement.appendChild(el);
      },
      unmount: async (props) => {
        props.domElement.innerHTML = "";
      },
    };
  },
  activeWhen: (location) => location.pathname.startsWith("/todo-app"),
});

start({ urlRerouteOnly: true });
```

The `angularTodo` repo continues to use `ng run angularTodo:serve-mfe-original` — nothing changes on the polyrepo side.

---

### Option B — Full single-spa lifecycle in the polyrepo (advanced)

For full lifecycle management (proper Angular zone cleanup, router integration), add `single-spa-angular` to the `angularTodo` polyrepo:

```bash
# In C:\AngularToDO\angularTodo
npm install single-spa-angular
ng add single-spa-angular
```

`ng add single-spa-angular` automatically:

- Creates `src/main.single-spa.ts` with lifecycle exports
- Adds a `build:single-spa` target to `angular.json`
- Configures the Angular builder to output a SystemJS bundle
- Skips `bootstrapApplication` when loaded inside single-spa

The auto-generated `main.single-spa.ts`:

```typescript
// C:\AngularToDO\angularTodo\src\main.single-spa.ts
import { singleSpaAngular } from "single-spa-angular";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app/app.module";
import { Router } from "@angular/router";
import { NgZone } from "@angular/core";

const lifecycles = singleSpaAngular({
  bootstrapFunction: (singleSpaProps) =>
    platformBrowserDynamic([
      { provide: "single-spa-props", useValue: singleSpaProps },
    ]).bootstrapModule(AppModule),
  template: "<angular-todo-app />",
  Router,
  NgZone,
});

export const { bootstrap, mount, unmount } = lifecycles;
```

Build the single-spa bundle in the polyrepo:

```bash
# C:\AngularToDO\angularTodo
ng run angularTodo:build:single-spa
```

Update the Root Config to use the SystemJS bundle instead of the Web Component script:

```javascript
// root-config.js — Option B
registerApplication({
  name: "@mfe/angular-todo",
  app: () => System.import("http://localhost:4200/main.single-spa.js"),
  activeWhen: (location) => location.pathname.startsWith("/todo-app"),
});
```

Update `importmap.json` to point to the single-spa bundle:

```json
{
  "imports": {
    "@mfe/angular-todo": "http://localhost:4200/main.single-spa.js"
  }
}
```

The `nx.json` already registers `angularTodo` as an external project (configured during the initial setup):

```json
// nx.json — already configured
{
  "projects": {
    "angularTodo": {
      "root": "C:/AngularToDO/angularTodo",
      "tags": ["scope:external", "type:mfe", "framework:angular"]
    }
  }
}
```

---

## single-spa Pros and Cons

### Pros

| ✅ Advantage                   | Detail                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| True framework agnosticism     | No Web Component wrapper needed — React, Angular, Vue use the same lifecycle protocol        |
| Proper mount/unmount lifecycle | Memory is cleaned up when MFE unmounts — no Angular instances left running in the background |
| No host framework dependency   | Root Config is ~50 lines of vanilla JS — not tied to React or any other framework            |
| Battle-tested at scale         | Used by companies with 100+ MFEs in production (Canopy Tax, Scania, IKEA)                    |
| DevTools built-in              | `import-map-overrides` lets developers swap any MFE URL in the browser — no rebuild needed   |
| Reuses existing manifest       | Root Config reads the same `mfe.manifest.json` — no new registry format                      |
| Lazy loading built-in          | MFEs are not loaded until their route is activated — `System.import()` is always lazy        |

### Cons

| ❌ Disadvantage              | When it matters                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning curve               | `bootstrap/mount/unmount` + SystemJS + import maps is a new mental model for most teams                                                       |
| SystemJS is non-standard     | SystemJS module format differs from native ESM — adds a runtime dependency to every page load                                                 |
| Per-MFE adapter required     | Every MFE needs `single-spa-react`, `single-spa-angular`, or `single-spa-vue` installed                                                       |
| Shared dependency management | `react`, `@angular/core` etc. must be in the import map and loaded only once — tricky to version correctly across MFEs                        |
| More moving parts            | Import maps + SystemJS + Root Config + adapters replaces the simplicity of Webpack Module Federation                                          |
| Webpack MF coexistence       | single-spa's SystemJS format and Webpack Module Federation are parallel approaches — mixing them in one project requires careful coordination |

---

## Decision: single-spa vs Web Component vs Module Federation

| Scenario                     | Recommended approach                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| POC / < 20 MFEs              | **Web Component + manifest** — simpler, fewer dependencies                              |
| 20–50 MFEs, mixed frameworks | **single-spa + Nx** — lifecycle management becomes valuable                             |
| 50+ MFEs                     | **single-spa + Nx import maps** — full orchestration at scale                           |
| Polyrepo external vendor MFE | **Web Component** — vendor only needs to publish a URL, no single-spa adapter required  |
| Polyrepo internal team MFE   | **Either** — Web Component for simplicity, single-spa lifecycle for full memory control |
| Same-framework MFEs          | **Webpack Module Federation directly** — lighter, no adapters, no SystemJS              |

---

## Useful Commands Reference

```bash
# Install dependencies
npm install single-spa single-spa-react single-spa-angular import-map-overrides

# Generate Root Config app in Nx
nx generate @nx/web:application root-config --directory=apps/root-config

# Add single-spa-angular to an Angular MFE (monorepo)
ng add single-spa-angular --project=mfe-angular-app

# Add single-spa-angular to the polyrepo (run inside C:\AngularToDO\angularTodo)
ng add single-spa-angular

# Build all MFEs for single-spa
nx run-many --target=build:spa --all

# Build only affected MFEs
nx affected --target=build:spa

# Serve all MFEs in parallel
nx run-many --target=serve:spa --all --parallel
```

---

## Related Documents

| Document                                                                   | Description                           |
| -------------------------------------------------------------------------- | ------------------------------------- |
| [01-architecture-overview.md](./01-architecture-overview.md)               | High-level architecture and decisions |
| [04-module-federation-wiring.md](./04-module-federation-wiring.md)         | Webpack Module Federation setup       |
| [05-auth-flow.md](./05-auth-flow.md)                                       | Authentication across MFEs            |
| [06-single-spa-nx-workspace-plan.md](./06-single-spa-nx-workspace-plan.md) | Nx workspace plan                     |
| [linkedin-mfe-article.md](./linkedin-mfe-article.md)                       | Full architecture article             |

---

## References

| Resource                      | URL                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| single-spa official docs      | https://single-spa.js.org/docs/getting-started-overview             |
| single-spa-angular adapter    | https://single-spa.js.org/docs/ecosystem-angular                    |
| single-spa-react adapter      | https://single-spa.js.org/docs/ecosystem-react                      |
| single-spa-vue adapter        | https://single-spa.js.org/docs/ecosystem-vue                        |
| import-map-overrides DevTools | https://github.com/single-spa/import-map-overrides                  |
| SystemJS                      | https://github.com/systemjs/systemjs                                |
| Nx Module Federation          | https://nx.dev/technologies/module-federation/getting-started/intro |
| MFEDemo repository            | https://github.com/sudeep31/MFEDemo                                 |
| AngularTodo polyrepo          | https://github.com/sudeep31/angularTodo                             |

---

_Implementation guide for MFEDemo POC — April 2026_
