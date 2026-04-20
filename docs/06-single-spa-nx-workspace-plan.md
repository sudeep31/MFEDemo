# Single-SPA in Nx Workspace — Architecture Plan

> **Purpose**: Plan how to migrate or greenfield the MFE platform using **single-spa** as the orchestration layer inside an **Nx monorepo workspace**, while preserving polyrepo connectivity, cross-framework support, shared design system, and shared auth.
>
> **When to use this plan**: When the app count exceeds ~20 MFEs, or when cross-framework lifecycle management becomes complex enough that a custom React Shell is insufficient.

---

## 1. Why single-spa + Nx?

```mermaid
flowchart LR
    subgraph "Problem with plain Module Federation at scale"
        P1["50+ MFEs\nManual lifecycle per MFE\nin custom Shell code"]
        P2["Each framework needs\na different mount/unmount\nstrategy in Shell"]
        P3["Routing split between\nReact Router and\nAngular Router — conflict risk"]
        P4["No standardised\nhealth check or\nactivity function"]
    end

    subgraph "single-spa solves"
        S1["Standard lifecycle API\nmount / unmount / bootstrap\nfor every framework"]
        S2["Built-in cross-framework\norchestration — React, Angular,\nVue, Vanilla natively"]
        S3["Single root router\n(single-spa router)\nall MFEs share one URL space"]
        S4["Activity functions\nper MFE — declarative\nroute-to-MFE mapping"]
    end

    subgraph "Nx solves"
        N1["Monorepo tooling:\nbuild, test, lint\nper project + affected"]
        N2["Dependency graph\nvisualisation across\nall MFEs + shared libs"]
        N3["Generators for\nscaffolding new MFEs\nin seconds"]
        N4["Nx Module Federation\nplugin for Webpack 5\nor Rspack"]
        N5["Remote caching\n(Nx Cloud) for CI speed\nacross 50+ projects"]
    end

    P1 & P2 & P3 & P4 --> S1 & S2 & S3 & S4
    S1 & S2 & S3 & S4 -.-> N1 & N2 & N3 & N4 & N5
```

---

## 2. Key Concepts Before Implementation

### single-spa Terminology

| Term                  | Meaning                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Root Config**       | The HTML entry point + `registerApplication()` calls — replaces the custom Shell      |
| **Application**       | A full MFE (React, Angular, Vue) with `bootstrap`, `mount`, `unmount` lifecycle hooks |
| **Parcel**            | A reusable component without its own routing — like a shared widget                   |
| **Utility Module**    | A shared library (auth-lib, design-system) without any UI — loaded once               |
| **Activity Function** | A function `(location) => boolean` that tells single-spa when to activate an MFE      |
| **Import Map**        | A JSON file mapping module names to URLs — replaces `mfe-manifest.json`               |
| **System.js**         | Module loader used by single-spa to load MFEs from import maps at runtime             |

### Nx Terminology

| Term            | Meaning                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| **Workspace**   | The root Nx monorepo folder                                                 |
| **Project**     | An app or lib inside the workspace (each has its own `project.json`)        |
| **Application** | A deployable project (Shell, each MFE)                                      |
| **Library**     | A shared, non-deployable project (`@mfe/auth-lib`, `@mfe/design-system`)    |
| **Tag**         | Labels on projects for lint rules (`scope:shell`, `scope:mfe`, `type:util`) |
| **Affected**    | `nx affected` — runs only tasks that changed since last commit              |

---

## 3. Target Workspace Structure

```
MFEDemo/                                  ← Nx workspace root
├── nx.json                               ← Nx configuration
├── package.json                          ← Root dependencies
├── tsconfig.base.json                    ← Shared TS paths
├── import-map.dev.json                   ← Import map (dev)
├── import-map.prod.json                  ← Import map (prod)
│
├── apps/
│   ├── root-config/                      ← single-spa Root Config (Shell replacement)
│   │   ├── src/
│   │   │   ├── index.ejs                 ← HTML entry with SystemJS + import map
│   │   │   └── root-config.ts            ← registerApplication() calls
│   │   └── project.json
│   │
│   ├── mfe-react-app/                    ← React MFE (co-located)
│   │   ├── src/
│   │   │   ├── main.tsx                  ← single-spa-react lifecycle exports
│   │   │   └── root.component.tsx
│   │   └── project.json
│   │
│   └── mfe-angular-app/                  ← Angular 21.5 Zoneless MFE (co-located)
│       ├── src/
│       │   ├── main.ts                   ← single-spa-angular lifecycle exports
│       │   └── app/app.component.ts      ← Standalone, Signals-based
│       └── project.json
│
├── libs/
│   ├── design-system/                    ← @mfe/design-system (Bootstrap 5 SCSS)
│   │   ├── src/
│   │   │   └── index.scss
│   │   └── project.json
│   │
│   ├── web-components/                   ← @mfe/web-components (Custom Elements)
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   └── auth-lib/                         ← @mfe/auth-lib (single-spa utility module)
│       ├── src/
│       │   └── index.ts
│       └── project.json
│
└── docs/                                 ← This folder
```

**Polyrepo MFEs** (separate Git repos — NOT in this workspace) are registered only in the import map:

```json
{
  "imports": {
    "@mfe/external-react-app": "https://cdn.company.com/external-react/v1.2/main.js",
    "@mfe/external-angular-app": "https://cdn.company.com/external-angular/v1.0/main.js"
  }
}
```

---

## 4. Architecture Diagram

```mermaid
graph TB
    subgraph "Browser"
        HTML["index.ejs\n(SystemJS + import-map)"]

        subgraph "single-spa Root Config"
            RC["root-config.ts\nregisterApplication()\nfor each MFE"]
            ROUTER["single-spa router\n(activity functions\npath → MFE)"]
            RC --> ROUTER
        end

        subgraph "Utility Modules (loaded once)"
            AUTH["@mfe/auth-lib\n(SystemJS utility module)\ngetToken, getUser, logout"]
            DS["@mfe/design-system\n(Bootstrap 5 SCSS)\nloaded globally"]
            WC["@mfe/web-components\n(Custom Elements)\nregistered globally"]
        end

        subgraph "MFE Applications"
            R_MFE["@mfe/react-app\n(single-spa-react lifecycle)\nactivates at /react-app"]
            A_MFE["@mfe/angular-app\n(single-spa-angular lifecycle)\nAngular 21.5 Zoneless\nactivates at /angular-app"]
            EXT_MFE["@mfe/external-app\n(polyrepo — loaded from CDN URL)\nactivates at /external"]
        end

        HTML -->|"loads"| RC
        HTML -->|"loads"| AUTH
        HTML -->|"loads"| DS
        HTML -->|"loads"| WC

        ROUTER -->|"activity fn returns true"| R_MFE
        ROUTER -->|"activity fn returns true"| A_MFE
        ROUTER -->|"activity fn returns true"| EXT_MFE

        R_MFE & A_MFE & EXT_MFE -->|"import '@mfe/auth-lib'"| AUTH
    end

    subgraph "Import Map (JSON)"
        IM["import-map.json\n{\n  '@mfe/root-config': 'http://localhost:9000/...'\n  '@mfe/react-app': 'http://localhost:3001/...'\n  '@mfe/angular-app': 'http://localhost:4201/...'\n  '@mfe/auth-lib': 'http://localhost:3010/...'\n  '@mfe/external-app': 'https://cdn/.../main.js'\n}"]
    end

    RC -->|"SystemJS resolves\nvia import map"| IM

    style AUTH fill:#3b82f6,color:#fff
    style IM fill:#f59e0b,color:#000
```

---

## 5. single-spa Lifecycle Flow

```mermaid
sequenceDiagram
    participant Browser
    participant RootConfig as Root Config
    participant SingleSpa as single-spa Router
    participant ReactMFE as @mfe/react-app
    participant AngularMFE as @mfe/angular-app
    participant AuthLib as @mfe/auth-lib

    Browser->>RootConfig: Page loads
    RootConfig->>AuthLib: import '@mfe/auth-lib' (SystemJS)
    AuthLib-->>RootConfig: singleton loaded

    RootConfig->>SingleSpa: registerApplication(reactApp, activityFn)
    RootConfig->>SingleSpa: registerApplication(angularApp, activityFn)
    RootConfig->>SingleSpa: start()

    Browser->>SingleSpa: Navigate to /react-app
    SingleSpa->>SingleSpa: Evaluate activity functions
    Note over SingleSpa: reactApp.activityFn('/react-app') = true
    Note over SingleSpa: angularApp.activityFn('/react-app') = false

    SingleSpa->>ReactMFE: bootstrap()
    ReactMFE-->>SingleSpa: bootstrapped
    SingleSpa->>ReactMFE: mount()
    ReactMFE->>AuthLib: import '@mfe/auth-lib' → getToken()
    ReactMFE-->>SingleSpa: mounted
    SingleSpa-->>Browser: React MFE visible

    Browser->>SingleSpa: Navigate to /angular-app
    SingleSpa->>ReactMFE: unmount()
    ReactMFE-->>SingleSpa: unmounted

    SingleSpa->>AngularMFE: bootstrap()
    AngularMFE-->>SingleSpa: bootstrapped
    SingleSpa->>AngularMFE: mount()
    AngularMFE->>AuthLib: import '@mfe/auth-lib' → getToken()
    AngularMFE-->>SingleSpa: mounted
    SingleSpa-->>Browser: Angular 21.5 MFE visible
```

---

## 6. Nx Workspace Setup — Step by Step

### Phase 1 — Nx Workspace Init

```mermaid
flowchart TD
    P1_1["nx create-nx-workspace MFEDemo\n--preset=empty\n--packageManager=npm"]
    P1_2["nx add @nx/react\nnx add @nx/angular\nnx add @nx/js"]
    P1_3["npm install single-spa\nsingle-spa-react\nsingle-spa-angular\nsystemjs\nimportmap-overrides"]
    P1_4["npm install -D @nx/module-federation\nsingle-spa-inspect\nconcurrently"]

    P1_1 --> P1_2 --> P1_3 --> P1_4
```

**Commands:**

```bash
# 1. Create workspace
npx create-nx-workspace@latest MFEDemo --preset=empty --packageManager=npm

# 2. Add framework plugins
nx add @nx/react
nx add @nx/angular
nx add @nx/js

# 3. Install single-spa runtime
npm install single-spa single-spa-react single-spa-angular systemjs importmap-overrides

# 4. Install dev tools
npm install -D @nx/module-federation concurrently single-spa-inspect
```

---

### Phase 2 — Generate Root Config (Shell)

```mermaid
flowchart TD
    P2_1["nx generate @nx/js:app root-config\n--directory=apps/root-config"]
    P2_2["Configure webpack:\ncreate apps/root-config/webpack.config.js\n(single-spa root-config build)"]
    P2_3["Create index.ejs:\nimport-map script tag\nSystemJS shim\n<single-spa-router> outlet"]
    P2_4["Create root-config.ts:\nregisterApplication() per MFE\nconfigured by import map"]

    P2_1 --> P2_2 --> P2_3 --> P2_4
```

**`apps/root-config/src/index.ejs`:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MFE Platform</title>

    <!-- Import map: maps @mfe/* names to URLs -->
    <!-- In dev: loaded from import-map.dev.json -->
    <!-- In prod: loaded from CDN -->
    <script type="systemjs-importmap" src="/import-map.dev.json"></script>

    <!-- SystemJS module loader -->
    <script src="https://cdn.jsdelivr.net/npm/systemjs@6/dist/system.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/systemjs@6/dist/extras/amd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/systemjs@6/dist/extras/named-exports.min.js"></script>

    <!-- importmap-overrides: lets devs override individual MFE URLs in browser -->
    <script src="https://cdn.jsdelivr.net/npm/importmap-overrides/dist/importmap-overrides.js"></script>
    <imo-dev-tools></imo-dev-tools>

    <!-- Bootstrap 5 CSS (from shared design-system CDN or local) -->
    <link rel="stylesheet" href="/shared/bootstrap.min.css" />
  </head>
  <body>
    <mfe-nav></mfe-nav>
    <!-- Parcel: shared nav Web Component -->

    <!-- single-spa mounts MFEs into this div -->
    <div id="single-spa-application"></div>

    <!-- Boot the Root Config -->
    <script>
      System.import("@mfe/root-config");
    </script>
  </body>
</html>
```

**`apps/root-config/src/root-config.ts`:**

```typescript
import { registerApplication, start } from "single-spa";

// Activity functions — declarative route → MFE mapping
const pathPrefix = (prefix: string) => (location: Location) =>
  location.pathname.startsWith(prefix);

registerApplication({
  name: "@mfe/react-app",
  app: () => System.import("@mfe/react-app"), // resolved via import map
  activeWhen: pathPrefix("/react-app"),
});

registerApplication({
  name: "@mfe/angular-app",
  app: () => System.import("@mfe/angular-app"),
  activeWhen: pathPrefix("/angular-app"),
});

registerApplication({
  name: "@mfe/external-app",
  app: () => System.import("@mfe/external-app"), // polyrepo: CDN URL in import map
  activeWhen: pathPrefix("/external"),
});

// single-spa takes control of routing
start({ urlRerouteOnly: true });
```

---

### Phase 3 — Generate React MFE

```bash
# Generate React app
nx generate @nx/react:app mfe-react-app --directory=apps/mfe-react-app --bundler=webpack
```

**`apps/mfe-react-app/src/main.tsx` — single-spa lifecycle exports:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import { App } from './app/App';

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err) {
    return <div>Error in React MFE: {err.message}</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
```

**`apps/mfe-react-app/webpack.config.js`:**

```js
const { composePlugins, withNx } = require("@nx/webpack");
const { withReact } = require("@nx/react");
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = composePlugins(withNx(), withReact(), (config) => {
  config.output.libraryTarget = "system"; // ← SystemJS format for single-spa
  config.plugins.push(
    new ModuleFederationPlugin({
      name: "mfeReactApp",
      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true },
        "@mfe/auth-lib": { singleton: true },
      },
    }),
  );
  return config;
});
```

---

### Phase 4 — Generate Angular 21.5 MFE (Zoneless)

```bash
# Generate Angular app
nx generate @nx/angular:app mfe-angular-app --directory=apps/mfe-angular-app --bundler=webpack
nx add @angular-architects/module-federation --project=mfe-angular-app
```

**`apps/mfe-angular-app/src/main.ts` — single-spa-angular lifecycle:**

```typescript
import { NgZone } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import singleSpaAngular from "single-spa-angular";
import { AppComponent } from "./app/app.component";
import { mfeRoutes } from "./app/app.routes";

const lifecycles = singleSpaAngular({
  bootstrapFunction: (singleSpaProps) =>
    bootstrapApplication(AppComponent, {
      providers: [
        provideZonelessChangeDetection(), // ← Angular 21.5 zoneless
        provideRouter(mfeRoutes),
      ],
    }),
  template: "<mfe-angular-app />",
  // No NgZone — zoneless
  Router,
  NavigationStart,
  NgZone,
});

export const { bootstrap, mount, unmount } = lifecycles;
```

---

### Phase 5 — Shared Libraries as Utility Modules

```mermaid
flowchart LR
    subgraph "Nx libs/ (built as SystemJS modules)"
        AL["libs/auth-lib\n@mfe/auth-lib\ntype: utility\nLoaded ONCE by Root Config\nall MFEs import via System.import"]
        DS["libs/design-system\n@mfe/design-system\nBootstrap 5 SCSS\nGlobal CSS — no SystemJS needed"]
        WC["libs/web-components\n@mfe/web-components\nCustom Elements\nLoaded once — self-registers"]
    end

    subgraph "Import Map entry"
        IM_AL["'@mfe/auth-lib': 'http://localhost:3010/auth-lib.js'"]
        IM_WC["'@mfe/web-components': 'http://localhost:3010/web-components.js'"]
    end

    AL --> IM_AL
    WC --> IM_WC
```

**`libs/auth-lib/src/index.ts`** — built as a SystemJS utility module:

```typescript
// This module is imported by ALL MFEs via: import('@mfe/auth-lib')
// single-spa loads it once — all MFEs share the same instance

export const authLib = {
  setToken(accessToken: string, refreshToken: string, expiresIn: number): void {
    /* ... */
  },
  getToken(): string | null {
    /* ... */
  },
  getUser(): UserProfile | null {
    /* ... */
  },
  isAuthenticated(): boolean {
    /* ... */
  },
  logout(): void {
    /* ... */
  },
  onTokenExpiry(callback: () => void): () => void {
    /* ... */
  },
};
```

**`libs/auth-lib/project.json` — build as SystemJS:**

```json
{
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "outputPath": "dist/libs/auth-lib",
        "outputFileName": "auth-lib.js",
        "outputHashing": "none",
        "libraryTarget": "system"
      }
    }
  }
}
```

---

### Phase 6 — Import Map Configuration

```mermaid
graph TB
    subgraph "import-map.dev.json (local dev)"
        DEV["{\n  'imports': {\n    '@mfe/root-config':   'http://localhost:9000/root-config.js',\n    '@mfe/react-app':     'http://localhost:3001/main.js',\n    '@mfe/angular-app':   'http://localhost:4201/main.js',\n    '@mfe/auth-lib':      'http://localhost:3010/auth-lib.js',\n    '@mfe/web-components':'http://localhost:3010/web-components.js',\n    '@mfe/external-app':  'http://localhost:3002/main.js'\n  }\n}"]
    end

    subgraph "import-map.prod.json (production)"
        PROD["{\n  'imports': {\n    '@mfe/root-config':   'https://cdn.company.com/root-config/v1.0/rc.js',\n    '@mfe/react-app':     'https://cdn.company.com/react-app/v3.1/main.js',\n    '@mfe/angular-app':   'https://cdn.company.com/angular-app/v2.0/main.js',\n    '@mfe/auth-lib':      'https://cdn.company.com/shared/auth-lib/v1.5/auth-lib.js',\n    '@mfe/external-app':  'https://cdn.partner.com/app/latest/main.js'\n  }\n}"]
    end

    subgraph "Adding a new MFE"
        ADD["Add one line to import-map:\n'@mfe/new-app': 'http://localhost:3003/main.js'\n\nAdd registerApplication() to root-config.ts\n(OR make it data-driven from import map)"]
    end

    DEV & PROD --> ADD
```

**`import-map.dev.json`:**

```json
{
  "imports": {
    "@mfe/root-config": "http://localhost:9000/root-config.js",
    "@mfe/react-app": "http://localhost:3001/main.js",
    "@mfe/angular-app": "http://localhost:4201/main.js",
    "@mfe/auth-lib": "http://localhost:3010/auth-lib.js",
    "@mfe/web-components": "http://localhost:3010/web-components.js",
    "single-spa": "https://cdn.jsdelivr.net/npm/single-spa@6/lib/system/single-spa.min.js",
    "rxjs": "https://cdn.jsdelivr.net/npm/rxjs@7/dist/bundles/rxjs.umd.min.js"
  }
}
```

---

### Phase 7 — Nx Project Tags & Dependency Rules

```mermaid
graph LR
    subgraph "Tag Structure"
        RC_TAG["root-config\nscope:shell\ntype:app"]
        R_TAG["mfe-react-app\nscope:mfe\ntype:app\nframework:react"]
        A_TAG["mfe-angular-app\nscope:mfe\ntype:app\nframework:angular"]
        AUTH_TAG["auth-lib\nscope:shared\ntype:util"]
        DS_TAG["design-system\nscope:shared\ntype:util"]
        WC_TAG["web-components\nscope:shared\ntype:util"]
    end

    subgraph "Lint Rules (.eslintrc.json)"
        RULE1["scope:mfe cannot import scope:shell"]
        RULE2["scope:shell can import scope:shared"]
        RULE3["scope:mfe can import scope:shared"]
        RULE4["scope:mfe cannot import scope:mfe\n(MFEs must not directly import each other)"]
    end

    AUTH_TAG & DS_TAG & WC_TAG --> RULE2 & RULE3
    RC_TAG --> RULE2
    R_TAG & A_TAG --> RULE3 & RULE4
```

**`.eslintrc.json` (root) — enforce MFE boundaries:**

```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependency": true,
        "depConstraints": [
          {
            "sourceTag": "scope:shell",
            "onlyDependOnLibsWithTags": ["scope:shared"]
          },
          {
            "sourceTag": "scope:mfe",
            "onlyDependOnLibsWithTags": ["scope:shared"]
          },
          {
            "sourceTag": "scope:shared",
            "onlyDependOnLibsWithTags": ["scope:shared"]
          }
        ]
      }
    ]
  }
}
```

---

### Phase 8 — Nx Serve (Dev — All Apps Concurrently)

```mermaid
flowchart LR
    NX["nx run-many\n--target=serve\n--projects=root-config,mfe-react-app,mfe-angular-app,auth-lib,web-components\n--parallel=5"]

    subgraph "Running servers"
        S1["root-config → :9000"]
        S2["mfe-react-app → :3001"]
        S3["mfe-angular-app → :4201"]
        S4["auth-lib → :3010"]
        S5["web-components → :3010"]
    end

    NX --> S1 & S2 & S3 & S4 & S5
```

**`package.json` scripts:**

```json
{
  "scripts": {
    "start": "nx run-many --target=serve --parallel=5",
    "start:shell": "nx serve root-config",
    "start:react": "nx serve mfe-react-app",
    "start:angular": "nx serve mfe-angular-app",
    "build:all": "nx run-many --target=build --all",
    "build:affected": "nx affected --target=build",
    "test:affected": "nx affected --target=test",
    "graph": "nx graph"
  }
}
```

---

## 7. Adding a Polyrepo MFE — 4 Steps

```mermaid
flowchart TD
    EXT1["Step 1\nPolyrepo MFE team\nbuilds their app with\nsingle-spa lifecycle exports:\nexport { bootstrap, mount, unmount }"]

    EXT2["Step 2\nBuild as SystemJS bundle\n(output.libraryTarget: 'system')\nHost remoteEntry at CDN URL"]

    EXT3["Step 3\nAdd to import-map.prod.json\n'@mfe/partner-app': 'https://cdn.partner.com/main.js'\n(no Nx workspace change needed)"]

    EXT4["Step 4\nAdd registerApplication() to root-config.ts\nOR make root-config data-driven\n(reads from import map keys automatically)"]

    EXT1 --> EXT2 --> EXT3 --> EXT4
    EXT4 --> DONE["✅ Polyrepo MFE live\nNo workspace redeployment\nNo root-config rebuild"]
```

---

## 8. Comparison: Custom React Shell vs single-spa + Nx

| Aspect                   | Custom React Shell (current)   | single-spa + Nx                                       |
| ------------------------ | ------------------------------ | ----------------------------------------------------- |
| Shell framework          | React                          | Framework-agnostic                                    |
| MFE lifecycle management | Manual (React.lazy + Suspense) | Built-in (`bootstrap`, `mount`, `unmount`)            |
| Cross-framework MFEs     | Via Web Components             | Native — React, Angular, Vue all first-class          |
| Routing                  | React Router                   | single-spa router (activity functions)                |
| Module loader            | Webpack Module Federation      | SystemJS + Import Maps                                |
| MFE registry             | `mfe-manifest.json`            | `import-map.json`                                     |
| Shared libraries         | Module Federation shared scope | SystemJS utility modules                              |
| Monorepo tooling         | Manual                         | Nx (generators, affected, dep graph)                  |
| 50+ app scale            | Manual Shell code growth       | Declarative — add to import map + registerApplication |
| Dev experience           | Run 2–3 apps manually          | `nx run-many` runs all in parallel                    |
| Polyrepo support         | URL in manifest                | URL in import map                                     |
| When to adopt            | POC / < 20 MFEs                | > 20 MFEs / diverse framework teams                   |

---

## 9. Migration Path: Custom React Shell → single-spa + Nx

```mermaid
flowchart TD
    STEP1["Step 1: Nx-ify the workspace\nRun: nx init\nfrom existing MFEDemo root\nNx wraps existing projects"]

    STEP2["Step 2: Generate root-config\nnx generate @nx/js:app root-config\nPort registerApplication() from\ncustom Shell App.tsx"]

    STEP3["Step 3: Migrate Shell auth to utility module\nMove @mfe/auth-lib to libs/auth-lib\nBuild as SystemJS\nAdd to import map"]

    STEP4["Step 4: Add single-spa lifecycle to React MFE\nReplace ReactDOM.render with\nsingle-spa-react lifecycles\n(bootstrap, mount, unmount)"]

    STEP5["Step 5: Add single-spa lifecycle to Angular MFE\nInstall single-spa-angular\nReplace bootstrapAngularMfe\nwith single-spa-angular lifecycles"]

    STEP6["Step 6: Replace mfe-manifest.json with import-map.json\nSame pattern — URL per MFE\nSystemJS resolves at runtime"]

    STEP7["Step 7: Remove custom Shell (React app)\nroot-config + single-spa replaces it\nAll routing via activity functions"]

    DONE["✅ Full single-spa + Nx workspace\nAll existing MFEs migrated\nPolyrepo MFEs: add to import map only"]

    STEP1 --> STEP2 --> STEP3 --> STEP4 --> STEP5 --> STEP6 --> STEP7 --> DONE
```

---

## 10. Summary: When to Use This Plan

| Trigger                                 | Action                                                               |
| --------------------------------------- | -------------------------------------------------------------------- |
| MFE count < 20                          | Stay with custom React Shell + `mfe-manifest.json` (current plan)    |
| MFE count reaches 20                    | Begin Nx-ifying the workspace (Step 1 of migration)                  |
| Cross-framework lifecycle issues appear | Add single-spa Root Config (Steps 2–5 of migration)                  |
| 50+ MFEs with diverse teams             | Full single-spa + Nx — import map is the registry, Nx handles builds |
| Polyrepo MFEs from external teams       | Both plans support it — import map URL is the contract               |
