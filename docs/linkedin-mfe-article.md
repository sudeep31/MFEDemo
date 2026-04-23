# Micro Frontend Architecture — A Practical Guide

**Topic: Building Scalable Web Applications with Micro Frontends**

---

## What is a Micro Frontend?

Just like **Microservices** broke the monolithic backend into independent services, **Micro Frontends (MFE)** apply the same thinking to the frontend.

Instead of one large React or Angular application owning the entire UI, you split the frontend into **smaller, independently deployable applications** — each owned by a different team, built in any framework, and deployed on its own schedule.

> Think of it as **"microservices for the browser"**.

---

## The Problem It Solves

Large frontend applications break in predictable ways. What starts as one team's product eventually carries dozens of modules, hundreds of screens, and backends that have long since evolved into independent microservices — yet the frontend is still one codebase, one build pipeline, one deployment.

The monolith is holding together things that have already grown apart.

The symptoms appear across two dimensions — what the **product cannot do** and what the **teams cannot do**. Both need to be present before MFE is the justified answer. And once they are, the next question is not just _whether_ to use MFE — it is _which strategy_ fits the organisational reality.

---

### The Warning Signs

Here are the symptoms that show a frontend monolith has grown past the point where a single codebase is the right structure.

**Product symptoms — what the application can no longer do:**

| What you observe                                                              | What it tells you                                                                             |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A change in one module breaks unrelated features elsewhere                    | No enforced boundary — DOM, state, and runtime are all shared across everything               |
| Modules need different release schedules but are forced to ship as one unit   | Deployment is too coarse — compliance-gated and fast-moving sections are artificially coupled |
| A legacy section cannot be rewritten without freezing the rest of the product | There is no way to swap one area out independently — the monolith owns everything             |
| A new framework or library cannot be introduced in just one area              | The entire team must agree and migrate the whole codebase at once                             |
| A vendor, partner, or acquired product cannot be embedded cleanly             | The monolith assumes one codebase, one build system, one pipeline for everything              |
| Users download code for features they will never visit on a given page        | No lazy-loading boundary — every module ships in every bundle regardless of the route         |

**Team symptoms — what the teams can no longer do:**

| What you observe                                                          | What it tells you                                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| One team's PR regularly blocks or breaks another team's work              | Shared codebase means shared blast radius — ownership has no hard boundary |
| CI takes 30+ minutes for a small, isolated change                         | Every commit rebuilds and retests everything — there is no scoped build    |
| A PR in one module needs sign-off from three unrelated teams              | Ownership is unclear — no one knows where the boundary is                  |
| Onboarding a new developer takes weeks to understand which part is theirs | No module boundaries — the whole codebase is everyone's concern by default |
| Teams wait on each other for every release                                | Deployment is a shared event — one team can delay the entire platform      |

> **The clearest signal:** when your product team says _"we cannot ship X until Y team finishes Z"_ — and X and Y have nothing to do with each other — the frontend has become the bottleneck.

---

### Is MFE the Right Answer?

MFE is not the right answer for every situation. A well-structured monolith with clear internal module boundaries is simpler and equally effective for small, single-team products.

MFE is justified when **YES** applies to at least two of these:

```
  Product signals:
  □ Different modules genuinely need different deployment schedules
  □ A legacy section cannot be migrated without blocking the rest of the product
  □ A vendor, partner, or acquired product must be embedded
  □ Compliance requires one area to be isolated (PCI-DSS, HIPAA, SOC 2)
  □ A new technology needs to be introduced in one area without a full rewrite

  Team signals:
  □ Multiple teams own the same frontend codebase and regularly block each other
  □ CI pipeline exceeds 20 minutes because everything builds together
  □ A change in one module triggers regression of the entire application

  Stop here — a modular monolith is the right answer if:
  ✗ One team, fewer than 5 developers
  ✗ Fewer than 3 distinct functional domains
  ✗ All modules always release together by design
```

**The right question is not "should we use MFE?" — it is "do we have boundaries that need to be independently deployable?"**

If yes: MFE gives each boundary its own build, its own deployment, and its own team ownership.
If no: a modular monolith with enforced internal boundaries is simpler and equally maintainable.

---

### Choosing Your Strategy — Monorepo, Polyrepo, or Hybrid

Once MFE is justified, the most consequential decision is not which framework to use — it is how your MFEs relate to each other in terms of repositories, ownership, and deployment pipelines. This decision is driven entirely by your organisational structure, not technical preference.

**Your pain points tell you which strategy fits:**

| If your primary problem is...                                               | The right strategy | What it gives you                                                                                                  |
| --------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Internal teams blocked on each other inside one shared repo                 | **Monorepo (Nx)**  | Nx enforces ownership boundaries per project, `nx affected` keeps CI fast, shared lib changes are atomic in one PR |
| An acquired company or vendor product that must be integrated               | **Polyrepo**       | External team keeps their own repo and pipeline — the Shell loads their MFE by URL only, zero shared codebase      |
| Compliance-regulated sections (payments, identity, health data)             | **Polyrepo**       | Isolated build pipeline, isolated audit trail, no shared deployment lifecycle with other modules                   |
| A mix — some teams are internal, some sections are regulated or external    | **Hybrid**         | Core product and shared libs live in a monorepo; regulated or external MFEs live in their own repos                |
| Design system must stay consistent while product teams deploy independently | **Hybrid**         | Shared libs published as versioned npm packages; each product MFE installs them and deploys freely                 |

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │          WHICH REPO STRATEGY FITS YOUR SITUATION?                   │
  ├──────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │  Q1: Does the same organisation own all parts of the frontend?      │
  │       │                                                              │
  │       ├── YES ──► Q2: Do all teams share the same CI platform?      │
  │       │                 │                                            │
  │       │                 ├── YES ──► Q3: Tight domain coupling or    │
  │       │                 │               frequent shared-lib changes? │
  │       │                 │                  │                         │
  │       │                 │                  ├── YES ──► MONOREPO     │
  │       │                 │                  └── NO  ──► HYBRID       │
  │       │                 │                                            │
  │       │                 └── NO  ──► HYBRID                          │
  │       │                                                              │
  │       └── NO  ──► Are the external parts vendor / acquired /        │
  │                   compliance-isolated?                               │
  │                      │                                               │
  │                      ├── YES ──► POLYREPO (for those MFEs)          │
  │                      └── NO  ──► HYBRID or MONOREPO                 │
  │                                                                      │
  │  Hard rules — always Polyrepo:                                       │
  │  • Vendor / partner / acquired product UI                            │
  │  • Compliance-regulated sections (PCI-DSS, HIPAA, SOC 2)            │
  │  • Teams with completely separate DevOps pipelines                   │
  └──────────────────────────────────────────────────────────────────────┘
```

|                      | Monorepo                                                   | Polyrepo                                                     | Hybrid                                                       |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Best for             | Internal teams, shared domain, frequent shared-lib changes | External vendors, acquired apps, strict compliance isolation | Mixed — internal core + external or regulated parts          |
| Shared lib updates   | Atomic — one PR covers lib and all consumers               | Manual version bump per repo                                 | Versioned npm releases — teams upgrade on their own schedule |
| Release independence | Coordinated, but `nx affected` scopes builds               | Fully independent — each team deploys alone                  | MFEs independent; shared libs versioned                      |
| Compliance isolation | Shared policies across all MFEs                            | Full isolation per repo, independent audit trail             | Per-domain isolation — regulated MFEs in their own repos     |
| Common mistake       | None if all teams are truly internal                       | Version drift across dozens of repos                         | Two-step lib updates require discipline                      |

> **The most common mistake:** choosing Polyrepo because it _feels_ more autonomous — then spending months managing version drift in shared libraries spread across 15 repos. If all your teams are internal and on the same CI platform, Monorepo with Nx is almost always the faster, safer path.

---

### What MFE Solves — Problem to Solution

| Problem                                  | How MFE solves it                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| One deploy for the entire frontend       | Each MFE has its own CI/CD — deploy only what changed                           |
| Framework lock-in                        | Each MFE can use any framework — React, Angular, Vue, or plain JS               |
| Slow builds and tests                    | Each MFE builds independently — Nx `affected` runs only what changed            |
| Blocked cross-team releases              | Teams deploy on their own schedule — no coordination needed                     |
| Cannot integrate partner or vendor UI    | Partner hosts their MFE — Shell loads it by URL, no code access required        |
| Compliance isolation                     | Regulated MFE runs in its own isolated process — independent audit trail        |
| Legacy UI that cannot be replaced safely | Replace one MFE at a time — the shell stays stable while sections are rewritten |
| Giant bundle on every page               | Shell lazy-loads only the MFE for the current route                             |

---

## Core Concepts

### 1. Shell (Host Application)

The Shell is the container that users first load in their browser. It is responsible for:

- Top-level layout (navigation, header, footer)
- Authentication and routing
- Loading each Micro Frontend on demand

The Shell does **not** contain any business logic. It is purely an orchestrator.

### 2. Remote Applications (MFEs)

Each MFE is an independent application that:

- Has its own build and deployment pipeline
- Exposes a URL endpoint (`remoteEntry.js`) that the Shell loads at runtime
- Can be built in **any framework** — React, Angular, Vue, or plain JavaScript
- **May or may not live in its own Git repository** — this depends on your repo strategy:
  - **Monorepo**: all MFEs share one repository (e.g. `github.com/sudeep31/MFEDemo` hosts Shell + React MFE + Vue MFE + Angular MFE together)
  - **Polyrepo**: each MFE has its own repository (e.g. `github.com/sudeep31/angularTodo` is completely separate)
  - **Hybrid**: shared libraries are in a central repo; product MFEs each have their own repo

### 3. Shared Libraries

Some code must be consistent across all MFEs:

- **Design System** — Bootstrap 5, shared SCSS, design tokens
- **Web Components** — framework-agnostic UI elements (buttons, headers, modals)
- **Auth Library** — shared token store so users never have to log in twice

---

## How It Works — The Connection

```
User opens browser
        ↓
Shell loads (React + Webpack 5)
        ↓
Shell reads mfe-manifest.json
{ "react-app": "http://cdn.../remoteEntry.js",
  "angular-app": "http://cdn.../remoteEntry.js" }
        ↓
User navigates to /react-app
        ↓
Shell fetches remoteEntry.js from CDN
        ↓
React MFE mounts inside Shell layout
        ↓
User sees the full page — seamlessly
```

The key insight: **the Shell only knows a URL, not the code**. Each MFE is loaded at runtime from wherever it is hosted.

---

## The Manifest / Registry File

The manifest is a simple JSON file — the **central registry** of all MFEs. The Shell reads it at startup to know which MFEs exist and where to load them from.

```json
// mfe.manifest.json  (see: github.com/sudeep31/MFEDemo)
{
  "reactApp": {
    "type": "webpack-mf",
    "remoteEntry": "http://localhost:3001/remoteEntry.js",
    "exposedModule": "./App",
    "framework": "react",
    "route": "/react-app",
    "active": true
  },
  "mfe-angular-app": {
    "type": "native-federation",
    "remoteEntry": "http://localhost:4201/main.js",
    "webComponent": "mfe-angular",
    "framework": "angular",
    "route": "/angular-app",
    "active": true
  },
  "angularTodo": {
    "type": "native-federation",
    "remoteEntry": "http://localhost:4200/main.js",
    "webComponent": "angular-todo-app",
    "framework": "angular",
    "route": "/todo-app",
    "repo": "polyrepo",
    "active": true
  }
}
```

Each field has a clear job:

| Field           | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `remoteEntry`   | URL of the MFE bundle — localhost in dev, CDN in production  |
| `exposedModule` | Which component/module to load from the MFE                  |
| `framework`     | Tells Shell how to mount it (React direct, or Web Component) |
| `route`         | URL path that activates this MFE                             |
| `active`        | Feature flag — disable any MFE without redeployment          |

---

## Connection Diagram — How Shell and MFEs Relate

```
  USER BROWSER
  ─────────────────────────────────────────────────────

             ┌─────────────────────────────┐
             │           SHELL             │
             │     React 19 + Webpack 5    │
             │  (Navigation, Auth, Layout) │
             └──────────────┬──────────────┘
                            │  reads at startup
                            ▼
             ┌─────────────────────────────┐
             │      mfe-manifest.json      │
             │  (Central MFE Registry)     │
             └────┬──────────┬──────────┬──┘
                  │          │          │
                  ▼          ▼          ▼
           ┌──────────┐ ┌──────────┐ ┌──────────┐
           │  React   │ │ Angular  │ │   Vue    │
           │   MFE    │ │   MFE    │ │   MFE    │
           │  :3001   │ │  :4201   │ │  :3002   │
           └──────────┘ └──────────┘ └──────────┘

  Each MFE is a separate app — separate repo, separate deploy
  Shell only knows their URL. Nothing else.

  ─────────────────────────────────────────────────────
  SHARED LAYER (loaded once, used by all)

        ┌─────────────┐   ┌─────────────┐
        │  Auth Lib   │   │Design System│
        │ (one token) │   │  (SCSS/CSS) │
        └─────────────┘   └─────────────┘
```

---

## Polyrepo Strategy

In a Polyrepo setup, **each MFE lives in its own Git repository**:

```
MFEDemo (Shell + Angular/React/Vue MFEs)  →  github.com/sudeep31/MFEDemo
angularTodo (standalone Angular Todo MFE) →  github.com/sudeep31/angularTodo
```

This is exactly how the demo in this article is structured. The **Shell, React MFE, Vue MFE, and Angular MFE** live inside the `MFEDemo` monorepo. The **Angular Todo** app is a completely independent polyrepo — it has its own `package.json`, its own Angular workspace, its own git history, and its own deployment pipeline. The Shell integrates it purely by URL — one entry in `mfe.manifest.json`:

```json
"angularTodo": {
  "type": "native-federation",
  "displayName": "Angular Todo",
  "description": "Angular 21 Todo App (polyrepo) — Native Federation + Web Component",
  "framework": "angular",
  "remoteEntry": "http://localhost:4200/main.js",
  "webComponent": "angular-todo-app",
  "route": "/todo-app",
  "repo": "polyrepo",
  "active": true
}
```

No Shell code was changed to add the polyrepo MFE. No Shell rebuild was triggered. Just a manifest entry and a URL.

Teams work completely independently. To integrate a new MFE, you simply add its URL to the manifest file — **no Shell code changes, no Shell redeployment**.

---

## Cross-Framework in Practice

One of the most powerful features of this architecture is that the Shell truly does not care what framework an MFE uses.

| MFE              | Framework             | How Shell loads it                            |
| ---------------- | --------------------- | --------------------------------------------- |
| React MFE        | React 19              | Direct lazy component via Webpack Module Fed. |
| Vue MFE          | Vue 3                 | Direct lazy component via Webpack Module Fed. |
| Angular MFE      | Angular 21 (Zoneless) | Web Component — `<mfe-angular>`               |
| Angular Todo MFE | Angular 21 (Polyrepo) | Web Component — `<angular-todo-app>`          |

The **Web Component** pattern is the bridge. Any framework can expose itself as a native HTML custom element. The Shell simply renders the HTML tag — it needs no knowledge of what runs inside.

---

## Web Component Strategy — The Cross-Framework Bridge

This is one of the most important architectural decisions in this platform, and it deserves a dedicated explanation.

### The Problem It Solves

The React shell uses **Webpack Module Federation** to load React and Vue MFEs directly — because they share the same runtime (`react`, `react-dom`). But Angular is a completely different runtime. You cannot `import()` an Angular component into a React tree. The two runtimes are fundamentally incompatible.

The options were:

| Option                                | What it means                                     | Problem                                                                           |
| ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `import()` Angular component directly | Treat Angular like a React component              | Angular's runtime, DI system and change detection do not work inside a React tree |
| iframe                                | Embed Angular in a sandboxed frame                | No shared auth, no shared CSS, terrible UX, heavy overhead                        |
| single-spa lifecycle                  | Use single-spa `bootstrap/mount/unmount`          | Correct approach at scale — overkill for a POC with < 10 MFEs                     |
| **Web Component**                     | Angular registers itself as a custom HTML element | ✅ Works natively in any framework, no wrapping library needed                    |

Web Components won because they are a **browser-native standard**. React renders `<mfe-angular>` exactly as it would render `<div>`. No React adapter, no Angular adapter — just an HTML element.

---

### Why We Chose Web Components for Angular MFEs

**Architectural reason:**
Angular's new **Zoneless + Standalone** model (`createApplication()` from `@angular/platform-browser`) produces a clean, self-contained application instance with its own injector. `@angular/elements` wraps that instance behind the Custom Elements API — the result is a perfectly encapsulated unit that any host can use.

**Practical reason in this project:**
The Shell is React 19 with Webpack Module Federation. The Angular MFEs use Native Federation (`@angular-architects/native-federation`). These are two completely different federation protocols — they cannot share modules directly. Web Components bridge this gap cleanly without requiring either side to adopt the other's protocol.

**Polyrepo reason:**
The Angular Todo app lives in a completely separate repo (`github.com/sudeep31/angularTodo`). Embedding it as a Web Component means the Shell needs exactly one thing: **a URL**. No shared build config, no shared package.json, no Nx project graph across repos. Just a URL in `mfe.manifest.json`.

---

### How We Implemented It — Step by Step

#### Step 1 — Bootstrap as a Web Component, not as a standalone app

Standard Angular app (`main.ts`):

```typescript
// Standard approach — mounts to <app-root>, not usable as a web component
bootstrapApplication(App, appConfig);
```

MFE approach (`bootstrap-mfe.ts`):

```typescript
import { createApplication } from "@angular/platform-browser";
import { createCustomElement } from "@angular/elements";
import { TodoListComponent } from "./app/features/todo-list/todo-list.component";

createApplication({
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
  ],
}).then((appRef) => {
  if (!customElements.get("angular-todo-app")) {
    const TodoElement = createCustomElement(TodoListComponent, {
      injector: appRef.injector,
    });
    customElements.define("angular-todo-app", TodoElement);
  }
});
```

Key decisions in this code:

- `createApplication()` instead of `bootstrapApplication()` — creates the Angular runtime without mounting to a DOM element
- `createCustomElement()` — wraps the Angular component behind the Custom Elements v1 API
- `customElements.define('angular-todo-app', ...)` — registers the tag name in the browser's global registry
- Guard `!customElements.get(...)` — prevents double-registration if the script is loaded twice

#### Step 2 — Expose a dedicated MFE entry point

We keep two separate entry points in each Angular MFE:

```
src/main.ts          ← standard standalone app (ng serve, for direct dev/testing)
src/main-mfe.ts      ← MFE entry point (dynamic import defers federation init)
```

`main-mfe.ts`:

```typescript
import("./bootstrap-mfe").catch((err) => console.error(err));
```

The dynamic `import()` is critical — it defers Angular's bootstrap until after Native Federation has initialised its shared scope. Without this, shared packages like `@angular/core` may load twice.

#### Step 3 — Shell loads it via script injection

The React shell's `NativeFederationMfe` component (driven by `mfe.manifest.json`) handles loading for **any** Angular MFE generically:

```jsx
function NativeFederationMfe({ config }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const { webComponent, remoteEntry } = config;

    // Already registered — render immediately
    if (customElements.get(webComponent)) {
      setStatus("ready");
      return;
    }

    // Inject the script tag — Angular bootstraps and registers the custom element
    const s = document.createElement("script");
    s.type = "module";
    s.src = remoteEntry; // e.g. http://localhost:4200/main.js
    s.onload = () =>
      customElements.whenDefined(webComponent).then(() => setStatus("ready"));
    s.onerror = () => setStatus("error");
    document.head.appendChild(s);
  }, [config]);

  if (status === "ready") {
    return React.createElement(config.webComponent, {
      style: { display: "block", padding: "1rem" },
    });
  }
  // ... loading / error states
}
```

No Angular-specific code in the shell. Adding a third Angular MFE requires zero shell code changes — just a new entry in `mfe.manifest.json`.

#### Step 4 — Why we expose `TodoListComponent`, not `App`

A critical architectural decision for the Angular Todo polyrepo:

```
❌ Expose App component
   App has <router-outlet> → Angular Router activates
   Shell also has React Router active
   Two routers fight over the URL → broken navigation

✅ Expose TodoListComponent directly
   Self-contained feature component
   No router dependency
   Renders correctly inside any host
```

This applies to any Angular MFE that has routing — always expose a **feature component**, not the root app component, when the host shell controls routing.

---

### Pros and Cons of the Web Component Approach

**Pros:**

| ✅ Advantage                | Detail                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| True framework independence | Shell renders an HTML tag — no knowledge of Angular whatsoever                            |
| Browser-native standard     | No polyfill needed in modern browsers — it's a W3C specification                          |
| Perfect for polyrepos       | Remote team publishes a URL; shell team adds one manifest entry                           |
| Style encapsulation         | Angular's ViewEncapsulation can optionally use Shadow DOM                                 |
| Independent lifecycle       | Angular manages its own change detection, DI, and memory — completely separate from React |
| Zero shared protocol        | Works even when shell and MFE use completely different federation tools                   |
| Testable in isolation       | The custom element can be tested on its own HTML page without any shell                   |

**Cons:**

| ❌ Disadvantage                 | When it matters                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| No React prop passing           | Cannot pass complex React objects/functions as attributes — attributes are strings only                           |
| Angular router conflict         | If Angular MFE uses routing, you must expose feature components, not the App root                                 |
| Double runtime in memory        | React and Angular both load in the same browser tab — heavier than same-framework MFEs                            |
| Custom events for communication | Shell↔MFE communication uses DOM custom events, not React state or Angular @Output                                |
| SSR complexity                  | Server-side rendering with Web Components requires additional setup (`@angular/elements` SSR support)             |
| Delayed first render            | Script injection → Angular bootstrap → custom element definition is asynchronous — adds ~100–300ms to first paint |

---

### Architectural Decision Guide — When to Use Web Components

```
  ┌──────────────────────────────────────────────────────────────────┐
  │         SHOULD YOUR MFE USE A WEB COMPONENT?                    │
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Q1: Is the MFE a different framework to the shell?             │
  │         │                                                        │
  │         ├── NO  ──► Use direct Module Federation import         │
  │         │           (React MFE in React Shell, Vue in Vue etc.) │
  │         │                                                        │
  │         └── YES ──► Q2: Is this a small team / POC (<20 MFEs)?  │
  │                           │                                      │
  │                           ├── YES ──► Web Component ✅           │
  │                           │           Simple, no extra deps      │
  │                           │                                      │
  │                           └── NO  ──► Q3: >20 MFEs at scale?    │
  │                                            │                     │
  │                                            ├── YES ──► single-spa│
  │                                            │   (full lifecycle   │
  │                                            │    management)      │
  │                                            │                     │
  │                                            └── NO  ──► Web       │
  │                                                        Component │
  │                                                        + manifest│
  │                                                                  │
  │  Special: MFE is in a polyrepo / external vendor?               │
  │    Always Web Component — shell only needs a URL                 │
  └──────────────────────────────────────────────────────────────────┘
```

**Use Web Components when:**

- The MFE uses a **different framework** than the shell
- The MFE is a **polyrepo** or owned by an external team
- You want **zero coupling** between host and remote at build time
- You have **fewer than ~20 MFEs** (beyond that, consider single-spa for lifecycle management)
- The MFE is a **self-contained widget or feature** that does not need deep routing integration

**Do not use Web Components when:**

- The MFE and shell share the **same framework** — use Module Federation directly (lighter, faster)
- You need to pass **complex objects or callbacks** from shell to MFE — use single-spa or Module Federation instead
- The MFE needs **deep URL routing integration** with the shell router
- You are building a **platform with 50+ MFEs** — single-spa's lifecycle management becomes essential at that scale

---

### The Web Component + Manifest Pattern in This Project

The combination of `mfe.manifest.json` and the Web Component loader means:

```
Adding a new Angular MFE = 1 manifest entry + 0 shell code changes

Before:                          After:
mfe.manifest.json                mfe.manifest.json
{                                {
  "mfe-angular-app": {...},        "mfe-angular-app": {...},
  "angularTodo": {...}             "angularTodo": {...},
}                                  "new-angular-mfe": {
                                     "type": "native-federation",
                                     "remoteEntry": "http://...",
                                     "webComponent": "new-tag",
                                     "route": "/new-feature",
                                     "active": true
                                   }
                                 }
```

The shell's `NativeFederationMfe` component reads the config and handles everything. No new React component. No new route definition. No shell rebuild required. The new MFE appears in the nav and on the home page cards automatically.

This is the **manifest-driven Web Component pattern** — and it is production-viable for any platform with up to ~20 cross-framework MFEs.

---

## Authentication — Single Sign-On Across All MFEs

Authentication is a shared concern. Users should log in once and every MFE should see their session.

This is solved with a **shared auth singleton**:

1. Shell authenticates the user and stores the token in memory
2. The `@mfe/auth-lib` library is loaded **once** and shared across all MFEs
3. Every MFE calls `authLib.getToken()` — they all get the same token from the same store
4. When the token expires, the auth library silently refreshes it — all MFEs benefit automatically
5. Logging out clears the token everywhere — no MFE retains a stale session

This pattern works even across React, Angular, and Vue MFEs simultaneously.

---

## Design System — Consistency Without Coupling

All 50+ MFEs share the same visual language without being tied to each other:

- **Bootstrap 5 SCSS** is published as a shared package. All MFEs import it.
- **Design tokens** (colours, spacing, typography) are CSS custom properties — change once, reflect everywhere.
- **Web Components** like `<mfe-button>` and `<mfe-header>` are built once using native browser APIs and work in any framework.

A designer changes the primary colour token. Every MFE updates on the next deploy — without touching a single MFE's code.

---

## How to Add a New Remote App

This is one of the strongest selling points of this architecture. Adding a brand-new MFE to the platform takes less than 10 minutes of integration work.

### Step 1 — Build and deploy the MFE

The remote team builds their app independently and deploys it anywhere (their own CDN, AWS S3, Netlify, Azure Blob — it does not matter). They expose one file:

```
https://cdn.company.com/new-mfe/remoteEntry.js
```

### Step 2 — Add one entry to the manifest

Open `mfe-manifest.json` in the Shell repository and add:

```json
"new-mfe": {
  "remoteEntry": "https://cdn.company.com/new-mfe/remoteEntry.js",
  "exposedModule": "./App",
  "framework": "react",
  "route": "/new-mfe",
  "active": true
}
```

### Step 3 — Deploy the manifest

The manifest is a static JSON file. Deploying it takes seconds. No Shell code was changed.

### Step 4 — Done

The Shell reads the updated manifest on next load. The new MFE appears automatically under its route. No pull request into the Shell. No Shell rebuild. No Shell redeployment.

```
  HOW ADDING A NEW MFE LOOKS:

  New Team                   Platform Team
  ──────────                 ─────────────
  1. Build MFE               (no action needed)
  2. Deploy to CDN           (no action needed)
  3. Send remoteEntry URL    →  Add 5 lines to manifest.json
                             →  Deploy manifest (seconds)
  4. MFE is live             ✓  Zero Shell changes
```

### Using `active: false` as a Feature Flag

Not ready to go live? Set `"active": false` in the manifest. The MFE is registered but invisible. Flip it to `true` when ready — instant release, no code change.

---

## Technology Stack

| Layer                    | Technology                           | Why                                         |
| ------------------------ | ------------------------------------ | ------------------------------------------- |
| Shell                    | React 19 + Webpack 5                 | Smallest bundle, best MFE ecosystem         |
| MFE integration          | Webpack 5 Module Federation          | Runtime loading, no code copying            |
| Angular MFEs             | Angular 21.5 — Zoneless + Standalone | No Zone.js interference, lighter bundle     |
| CSS framework            | Bootstrap 5 SCSS                     | No jQuery, design token support             |
| Web Components           | Native Custom Elements API           | Works in every framework                    |
| Monorepo tooling         | Nx Workspace                         | Build, test, dependency graph at scale      |
| Orchestration (50+ apps) | single-spa                           | Native cross-framework lifecycle management |
| Authentication           | JWT + OIDC-ready auth-lib            | One token store, all MFEs                   |

---

## Angular 21.5 — A Special Mention

Angular's new **Zoneless** architecture (`provideZonelessChangeDetection()`) and **Standalone Components** make it a first-class citizen in this MFE platform:

- **No Zone.js** — eliminates the historical problem of Angular monkey-patching browser APIs and conflicting with React or Vue MFEs running alongside it
- **No NgModule** — Angular MFEs now expose a clean bootstrap function, not an entire module tree
- **Signals** — fine-grained, predictable reactivity without Zone.js dependency

An Angular 21.5 MFE registers itself as a Web Component and integrates with the Shell just as cleanly as a React MFE.

---

## When to Use single-spa + Nx

For smaller setups (under 20 MFEs), a custom React Shell with Webpack Module Federation is sufficient and simpler to operate.

As the platform grows:

| MFE Count | Recommended Setup                                      |
| --------- | ------------------------------------------------------ |
| 1 – 20    | Custom React Shell + `mfe-manifest.json`               |
| 20 – 50   | Introduce Nx workspace for build tooling               |
| 50+       | Add single-spa as orchestration layer + Nx import maps |

**single-spa** replaces the custom Shell with a framework-agnostic Root Config. It manages the `bootstrap → mount → unmount` lifecycle for every MFE natively — React, Angular, Vue, and Vanilla — without any Web Component wrapping required.

**Nx** provides the monorepo tooling: generate new MFEs in seconds, run only affected builds in CI, visualise dependencies across 50+ projects, and enforce boundary rules so MFEs cannot accidentally import each other.

---

## Adding single-spa to an Nx Monorepo

> **Full implementation details, code samples, and polyrepo configuration are covered in the dedicated guide:**
> [07-single-spa-nx-implementation.md](https://github.com/sudeep31/MFEDemo/blob/main/docs/07-single-spa-nx-implementation.md)

The high-level steps to integrate single-spa into the MFEDemo Nx workspace are:

**Step 1 — Install packages**

```bash
npm install single-spa single-spa-react single-spa-angular import-map-overrides
```

**Step 2 — Create the Root Config application**

Generate a new minimal app in Nx that registers all MFEs. It reads the existing `mfe.manifest.json` — no new registry format needed.

```bash
nx generate @nx/web:application root-config --directory=apps/root-config
```

**Step 3 — Set up SystemJS import maps**

single-spa uses SystemJS import maps to resolve MFE URLs at runtime. An `importmap.json` maps each MFE name to its `remoteEntry` URL — the same URLs already in `mfe.manifest.json`.

**Step 4 — Adapt each MFE to export single-spa lifecycles**

Each MFE adds a framework adapter (`single-spa-react`, `single-spa-angular`, or `single-spa-vue`) and exports three functions: `bootstrap`, `mount`, and `unmount`.

**Step 5 — Add Nx `build:spa` and `serve:spa` targets**

Each MFE gets new Nx targets so single-spa builds are independent from the existing Webpack Module Federation builds:

```bash
nx run-many --target=build:spa --all
nx affected --target=build:spa   # only rebuild what changed
```

**Step 6 — Configure the polyrepo `angularTodo`**

Two options (both covered in the implementation guide):

- **Option A (recommended):** Keep the existing Web Component bootstrap. The Root Config wraps `<angular-todo-app>` with a thin single-spa lifecycle — **zero changes to the `angularTodo` repo**.
- **Option B (advanced):** Run `ng add single-spa-angular` inside the `angularTodo` polyrepo for full lifecycle management with proper Angular zone cleanup.

---

### single-spa Pros and Cons

**Pros:**

| ✅ Advantage                   | Detail                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| True framework agnosticism     | No Web Component wrapper needed — React, Angular, Vue use the same lifecycle protocol     |
| Proper mount/unmount lifecycle | Memory is cleaned up when MFE unmounts — no Angular instances left in the background      |
| No host framework dependency   | Root Config is ~50 lines of vanilla JS — not tied to React or any other framework         |
| Battle-tested at scale         | Used by companies with 100+ MFEs in production (Canopy Tax, Scania, IKEA)                 |
| DevTools built-in              | `import-map-overrides` lets developers swap any MFE URL in the browser without rebuilding |
| Reuses existing manifest       | Root Config reads the same `mfe.manifest.json` — no new registry format needed            |

**Cons:**

| ❌ Disadvantage              | When it matters                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Learning curve               | `bootstrap/mount/unmount` + SystemJS + import maps is a new mental model for most teams                       |
| SystemJS is non-standard     | Differs from native ESM — adds a runtime dependency to every page load                                        |
| Per-MFE adapter required     | Every MFE needs `single-spa-react`, `single-spa-angular`, or `single-spa-vue`                                 |
| Shared dependency management | Shared packages (`react`, `@angular/core`) must be in the import map and loaded only once — tricky to version |
| More moving parts            | Replaces the simplicity of Webpack Module Federation with import maps + SystemJS + adapters                   |

---

### single-spa vs Web Component — Which Approach for This Project?

| Scenario                     | Recommended approach                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| POC / < 20 MFEs              | **Web Component + manifest** (current setup — simpler, fewer deps)                      |
| 20–50 MFEs, mixed frameworks | **single-spa + Nx** (lifecycle management becomes valuable)                             |
| 50+ MFEs                     | **single-spa + Nx import maps** (full orchestration at scale)                           |
| Polyrepo external vendor MFE | **Web Component** (vendor only needs to publish a URL — no single-spa adapter)          |
| Polyrepo internal team MFE   | **Either** — Web Component for simplicity, single-spa lifecycle for full memory control |

For this POC with 4 MFEs, the current Web Component + manifest approach is the right choice. single-spa is the natural next step when the platform grows past ~20 MFEs.

For the complete implementation walkthrough, see: [07-single-spa-nx-implementation.md](https://github.com/sudeep31/MFEDemo/blob/main/docs/07-single-spa-nx-implementation.md)

---

## Workspace Tools for MFE — Beyond Nx

Nx is one of the most popular workspace tools for MFE, but it is not the only option. As of April 2026, there are several mature tools — each with different strengths. The right choice depends on your team size, framework mix, and how much you want the tool to do for you.

---

### 1. Nx (v21.x — April 2026)

The most full-featured workspace tool. Built specifically for monorepos with first-class support for React, Angular, Vue, Node.js, and Module Federation.

**Key features:**

- Built-in generators for MFE Shell and Remotes (`@nx/react`, `@nx/angular`, `@nx/module-federation`)
- `nx affected` — only build, test, and lint what actually changed
- Project graph visualisation — see all MFE dependencies at a glance
- Module boundary rules via ESLint (`@nx/enforce-module-boundaries`)
- Remote caching (Nx Cloud) — CI builds reuse cached results across team members
- First-class single-spa and Module Federation plugin support
- Distributed task execution (DTE) — split large CI across multiple machines

| ✅ Pros                                                             | ❌ Cons                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Richest MFE-specific tooling (generators, Module Federation plugin) | Steeper learning curve — many concepts to learn upfront     |
| `nx affected` saves significant CI time at scale                    | Opinionated project structure — may not fit existing setups |
| Built-in dependency graph and boundary enforcement                  | Nx Cloud (remote caching + DTE) is a paid service for teams |
| Strong community and official plugins for all major frameworks      | Plugin ecosystem is Nx-specific — not reusable outside Nx   |
| Generator scaffolding keeps all MFEs consistent                     | Can feel heavy for small projects with 2–3 apps             |

**Best for:** Large MFE platforms (20–200+ apps), teams wanting opinionated generators, Angular + React mixed workspaces.

---

### 2. Turborepo (v2.x — April 2026)

Acquired by Vercel. Focuses purely on task orchestration and caching — intentionally does not provide generators or project structure opinions.

**Key features:**

- Ultra-fast task runner with content-aware hashing
- Remote caching built-in (Vercel Remote Cache — free for Vercel users)
- Zero-config for most JavaScript/TypeScript monorepos
- Works with any package manager (npm, pnpm, yarn, bun)
- Simple `turbo.json` pipeline definition
- No code generators — you structure projects however you want

| ✅ Pros                                                      | ❌ Cons                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Extremely fast — written in Rust, minimal overhead           | No MFE-specific tooling — no generators, no Module Federation plugin |
| Zero opinion on project structure — works with any layout    | No dependency graph visualisation built-in                           |
| Remote caching is free on Vercel, simple self-hosted options | No module boundary enforcement — teams must self-govern              |
| Minimal learning curve — just a task runner                  | No framework-specific plugins — all wiring is manual                 |
| Works perfectly for polyrepo-like monorepo setups            | Less helpful for Angular projects compared to Nx                     |

**Best for:** Teams that want fast caching without opinions, React/Next.js heavy stacks, Vercel-deployed platforms, teams already using pnpm workspaces.

---

### 3. pnpm Workspaces (v10.x — April 2026)

Not a build tool — it is a package manager with native workspace support. Often used as the foundation under Nx or Turborepo, but can also stand alone.

**Key features:**

- Native workspace protocol (`workspace:*`) for linking local packages
- Content-addressable storage — saves disk space dramatically
- Strict dependency isolation — prevents phantom dependencies
- `pnpm --filter` to run commands on specific packages
- `pnpm --filter ...[origin/main]` to run only on changed packages
- Works with any build tool or bundler

| ✅ Pros                                                     | ❌ Cons                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Fastest install times of any package manager                | No task caching — must pair with Turborepo or Nx for that           |
| Strictest dependency resolution — catches hidden bugs early | No generators, no project scaffolding                               |
| Tiny learning curve — just a package manager                | No dependency graph UI — must script your own                       |
| Perfect foundation layer — use under Nx or Turborepo        | `--filter` syntax is powerful but less intuitive than `nx affected` |
| Excellent for shared library linking in Hybrid setups       | No module boundary enforcement                                      |

**Best for:** The foundation layer of any monorepo. Pair with Turborepo or Nx on top. Excellent standalone for Hybrid setups with 5–15 packages.

---

### 4. Lerna (v8.x — April 2026)

The original JavaScript monorepo tool. Now maintained by Nx (Nrwl). Modern Lerna delegates task running to Nx under the hood.

**Key features:**

- `lerna run` — execute scripts across packages
- `lerna publish` — versioning and publishing to npm in one command
- `lerna version` — independent or fixed versioning across packages
- Powered by Nx task runner for caching and affected detection
- Changelog generation built-in

| ✅ Pros                                                      | ❌ Cons                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Best-in-class npm publishing workflow                        | No MFE-specific tooling — no generators, no Module Federation            |
| Independent and fixed versioning modes                       | Modern Lerna is essentially Nx under the hood — why not use Nx directly? |
| Familiar to teams with long monorepo history                 | Smaller community momentum compared to Nx and Turborepo                  |
| Good for Hybrid setups — publish shared libs as npm packages | Less relevant for monorepo MFE setups where you don't publish            |
| Changelog generation saves release management time           | Adds a layer of abstraction over Nx without adding much value            |

**Best for:** Hybrid repo strategy where shared libs need to be versioned and published to npm. Less relevant for pure monorepo MFE setups.

---

### 5. Rush (v5.x — April 2026)

Built by Microsoft for managing very large monorepos with hundreds of projects. Used internally across Microsoft's web platform teams.

**Key features:**

- Supports pnpm, npm, and yarn as package managers
- Phased builds with incremental compilation
- `rush change` — enforced changelog entries before merge
- Strict approvals for new dependencies (shrinkwrap-based governance)
- Cobuild — distributed build execution across CI agents
- Designed for enterprise governance and compliance

| ✅ Pros                                                            | ❌ Cons                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Enterprise-grade governance — dependency approvals, change reviews | Steepest learning curve of all tools on this list                 |
| Scales to 500+ projects reliably                                   | No MFE generators — all wiring is manual                          |
| Strict shrinkwrap prevents supply chain surprises                  | Configuration is verbose — `rush.json`, `command-line.json`, etc. |
| Cobuild distributes work across CI agents at scale                 | Smaller community than Nx and Turborepo                           |
| Enforced changelogs improve release quality                        | Opinionated workflow — teams must adopt Rush's way of working     |

**Best for:** Large enterprises (500+ packages) with strict governance, compliance requirements, and supply chain security needs.

---

### 6. Bazel (v8.x — April 2026)

A polyglot build system from Google. Handles not just JavaScript, but also Java, Go, Python, C++, and more. Overkill for most MFE projects — but unbeatable at massive scale.

**Key features:**

- Language-agnostic — build frontend and backend in one graph
- Hermetic builds — every build is reproducible regardless of machine state
- Remote execution — distribute builds across a cluster of machines
- Fine-grained caching at the file level, not the package level
- Supports custom build rules for any toolchain

| ✅ Pros                                                      | ❌ Cons                                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Scales to tens of thousands of targets                       | Extremely steep learning curve — Starlark build language          |
| Polyglot — handles Java microservices + JS MFEs in one graph | No JavaScript-specific tooling — everything is manual rules       |
| Hermetic builds eliminate "works on my machine" issues       | Build files (`BUILD.bazel`) must be maintained per directory      |
| Remote execution is the gold standard for CI distribution    | Massive infrastructure investment — remote cache servers, workers |
| Proven at the largest scale imaginable                       | Vastly overkill for teams with under 100 projects                 |

**Best for:** Companies with 10,000+ build targets across multiple languages. Not recommended for typical MFE projects.

---

### Workspace Tool Comparison — At a Glance

|                          | Nx v21                    | Turborepo v2           | pnpm Workspaces v10    | Lerna v8                | Rush v5               | Bazel v8              |
| ------------------------ | ------------------------- | ---------------------- | ---------------------- | ----------------------- | --------------------- | --------------------- |
| Primary focus            | Full workspace management | Task running + caching | Package management     | Versioning + publishing | Enterprise governance | Polyglot build system |
| MFE generators           | ✅ Yes                    | ❌ No                  | ❌ No                  | ❌ No                   | ❌ No                 | ❌ No                 |
| Module Federation plugin | ✅ Yes                    | ❌ No                  | ❌ No                  | ❌ No                   | ❌ No                 | ❌ No                 |
| Task caching             | ✅ Local + Remote         | ✅ Local + Remote      | ❌ No                  | ✅ Via Nx               | ✅ Cobuild            | ✅ Remote execution   |
| Affected / incremental   | ✅ `nx affected`          | ✅ Content hashing     | ⚠️ `--filter` (manual) | ✅ Via Nx               | ✅ Phased builds      | ✅ Fine-grained       |
| Dependency graph UI      | ✅ Built-in               | ❌ No                  | ❌ No                  | ❌ No                   | ❌ No                 | ✅ `bazel query`      |
| Module boundaries        | ✅ ESLint rules           | ❌ No                  | ❌ No                  | ❌ No                   | ⚠️ Approvals only     | ❌ No                 |
| Learning curve           | Medium                    | Low                    | Low                    | Low                     | High                  | Very High             |
| Best MFE scale           | 20–200+ apps              | 5–50 apps              | 5–15 packages          | Hybrid publishing       | 100–500+ packages     | 1000+ targets         |
| Recommended for this POC | ✅ Primary choice         | Good alternative       | Use as foundation      | For Hybrid publishing   | Enterprise only       | Not recommended       |

---

### Which Should You Pick?

```
  ┌───────────────────────────────────────────────────────────────┐
  │            CHOOSING A WORKSPACE TOOL FOR MFE                 │
  ├───────────────────────────────────────────────────────────────┤
  │                                                               │
  │  Q1: Do you need MFE generators + Module Federation?        │
  │        │                                                     │
  │        ├── YES ──► Nx                                        │
  │        │                                                     │
  │        └── NO  ──► Q2: Do you need fast caching only?       │
  │                          │                                   │
  │                          ├── YES ──► Turborepo               │
  │                          │                                   │
  │                          └── NO  ──► Q3: Publishing libs?   │
  │                                           │                  │
  │                                           ├── YES ──► Lerna  │
  │                                           │                  │
  │                                           └── NO ──► pnpm   │
  │                                                              │
  │  Special cases:                                              │
  │  • Enterprise governance (500+ packages) ──► Rush            │
  │  • Polyglot (JS + Java + Go) at massive scale ──► Bazel     │
  └───────────────────────────────────────────────────────────────┘
```

---

## Key Benefits — Summary

| Benefit                 | How it is achieved                          |
| ----------------------- | ------------------------------------------- |
| Independent deployments | Each MFE has its own CI/CD pipeline         |
| Technology freedom      | Any framework per MFE — Shell does not care |
| Shared design language  | Shared SCSS tokens + Web Components         |
| Single sign-on          | Auth-lib singleton across all MFEs          |
| Scale to 50+ apps       | Add URL to manifest — zero Shell changes    |
| Polyrepo support        | Each MFE is its own Git repo                |
| Team autonomy           | Teams own their MFE end-to-end              |
| Resilience              | One MFE crash does not break others         |

---

## Final Thought

Micro Frontends are not a silver bullet. For small applications with one team, they add unnecessary complexity. But for large products with multiple teams, multiple frameworks, and the need to deploy independently — they are the right architectural choice.

The platform described here is designed to start simple and grow into the single-spa + Nx model only when the scale demands it. **Every decision is reversible. Every MFE is isolated. Every team is autonomous.**

That is the promise of Micro Frontend Architecture.

---

## Reference Resources

| Resource                                            | URL                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| MFEDemo GitHub (Shell + React + Vue + Angular MFEs) | https://github.com/sudeep31/MFEDemo                                                   |
| AngularTodo GitHub (Polyrepo Angular MFE)           | https://github.com/sudeep31/angularTodo                                               |
| single-spa + Nx — Full Implementation Guide         | https://github.com/sudeep31/MFEDemo/blob/main/docs/07-single-spa-nx-implementation.md |
| Webpack 5 Module Federation docs                    | https://webpack.js.org/concepts/module-federation/                                    |
| `@angular/elements` — Web Components                | https://angular.dev/guide/elements                                                    |
| `@angular-architects/native-federation`             | https://github.com/angular-architects/module-federation-plugin                        |
| single-spa official docs                            | https://single-spa.js.org/docs/getting-started-overview                               |
| Nx Module Federation plugin                         | https://nx.dev/technologies/module-federation/getting-started/intro                   |
| Angular Zoneless + Signals                          | https://angular.dev/guide/signals                                                     |

---

_Architecture designed for the MFEDemo POC — April 2026_
_Full technical documentation available in the project's `docs/` folder_
_Source code: https://github.com/sudeep31/MFEDemo_
