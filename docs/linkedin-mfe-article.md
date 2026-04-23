# Micro Frontend Architecture — A Practical Guide

**Topic: Building Scalable Web Applications with Micro Frontends**

---

## What is a Micro Frontend?

Just like **Microservices** broke the monolithic backend into independent services, **Micro Frontends (MFE)** apply the same thinking to the frontend.

Instead of one large React or Angular application owning the entire UI, you split the frontend into **smaller, independently deployable applications** — each owned by a different team, built in any framework, and deployed on its own schedule.

> Think of it as **"microservices for the browser"**.

---

## The Problem It Solves

Most large-scale web applications start as a single frontend codebase. As the product grows, this codebase accumulates problems at two distinct levels: **functional problems** (what the product cannot do) and **organisational problems** (what the team cannot do). Both must be felt before MFE is the right answer.

---

### Functional Problems — What the Product Cannot Do

These are product-level symptoms that show up in planning meetings, release post-mortems, and sprint retrospectives — long before anyone mentions architecture.

| Symptom                                                                       | Root cause                                                                                                    | Business impact                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A feature update in one area of the app breaks a completely unrelated area    | Everything shares the same DOM, state, and JS runtime — any side effect is global                             | Unplanned hotfixes, delayed releases, lost user trust   |
| You cannot run A/B tests or gradual rollouts on individual features           | The entire frontend deploys as one unit — there is no concept of "ship just this part"                        | Slower product experimentation, higher risk per release |
| An acquired product or partner widget cannot be integrated cleanly            | The monolith assumes one framework, one build system, one deployment pipeline                                 | Integration takes months instead of days                |
| The app is slow to load because the whole codebase ships on every page visit  | One giant bundle — users download code for features they will never use                                       | Poor Core Web Vitals, higher bounce rates               |
| Legacy parts of the UI cannot be rewritten without freezing the whole product | Rewrites must happen inside the monolith — you cannot swap one section independently                          | Technical debt compounds, no escape path                |
| Different product areas need different release cadences                       | Admin dashboard ships weekly; payment flow ships monthly after compliance review — impossible in one codebase | Teams are blocked waiting for each other                |

> **The clearest signal:** when your product team starts saying _"we cannot ship X until Y team finishes Z"_ — and Y and Z have nothing to do with each other — the frontend is the bottleneck.

---

### Organisational Problems — What the Team Cannot Do

Once the functional problems are visible, the team-level consequences follow:

- **One team's change can break another team's feature** — shared codebase, shared blast radius
- **Deployment is a bottleneck** — everyone must wait for everyone else to release together
- **The codebase becomes a monolith** — slow to build, slow to test, slow to understand
- **You cannot easily adopt new frameworks or technologies** — the whole team must agree and migrate at once
- **Onboarding new developers takes weeks** just to understand which part of the codebase is "theirs"

---

### How to Know You Are Ready for MFE — The Architectural Decision

MFE is not the right answer for every team. Adding it to a small app with one team introduces unnecessary complexity. The decision should be driven by evidence, not trend-following.

Use this checklist to assess whether MFE is the right next architectural step:

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │         IS YOUR TEAM READY FOR MICRO FRONTEND ARCHITECTURE?         │
  ├──────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │  Functional signals — YES to 2 or more means MFE is worth considering│
  │                                                                      │
  │  □ Different product areas have genuinely different release cadences  │
  │  □ You need to integrate a third-party, acquired, or partner UI       │
  │  □ Different parts of the app have very different performance needs   │
  │  □ You need to run independent A/B tests or feature flags per section │
  │  □ One area of the UI needs a technology the rest cannot adopt        │
  │                                                                      │
  │  Team / Scale signals — YES to 2 or more is a strong indicator       │
  │                                                                      │
  │  □ More than one team owns the same frontend codebase                 │
  │  □ A frontend change by one team regularly breaks another team's work │
  │  □ CI/CD pipeline takes > 20 minutes because everything builds at once│
  │  □ Onboarding a new developer to the frontend takes > 1 week         │
  │  □ Teams are blocked on each other for every release                  │
  │                                                                      │
  │  Hard boundaries — YES to any one of these means MFE is required     │
  │                                                                      │
  │  □ A vendor or partner must deploy their own UI inside your shell     │
  │  □ Compliance requires one section of the UI to be isolated           │
  │    (e.g. PCI-DSS for payments, HIPAA for health data)                 │
  │  □ You are integrating an acquired company's frontend product         │
  │                                                                      │
  │  Stop here if:                                                        │
  │  ✗ You have one team and fewer than 5 developers                      │
  │  ✗ The product has fewer than 3 distinct functional domains           │
  │  ✗ All parts of the app always release together by design             │
  │    → A well-structured monolith with clear module boundaries is better│
  └──────────────────────────────────────────────────────────────────────┘
```

**The right question is not "should we use MFE?" — it is "does our product have boundaries that need to be independently deployable?"**

If yes: MFE gives each boundary its own lifecycle.
If no: a modular monolith with clean internal boundaries is simpler and equally maintainable.

---

### What MFE Actually Solves — The Direct Mapping

| Problem                            | How MFE solves it                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| One deploy for the entire frontend | Each MFE has its own CI/CD — deploy only what changed                                     |
| Framework lock-in                  | Each MFE can use any framework — React, Angular, Vue, or plain JS                         |
| Slow builds and tests              | Each MFE builds and tests independently — Nx `affected` runs only what changed            |
| Blocked cross-team releases        | Teams deploy their MFE on their own schedule — no coordination needed                     |
| Cannot integrate partner/vendor UI | Partner hosts their MFE — Shell loads it by URL. No code access required                  |
| Compliance isolation               | Payment MFE runs in its own process — strict boundary, independent audit trail            |
| Legacy UI cannot be replaced       | Replace one MFE at a time — the monolith shell stays stable while sections are rewritten  |
| Giant bundle on every page         | Shell lazy-loads only the MFE for the current route — users download only what they visit |

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

## Monorepo vs Polyrepo vs Hybrid — When to Use Which

This is one of the most debated decisions in MFE architecture. There is no single right answer — the choice depends on your team structure, release cadence, and organisational boundaries.

---

### Monorepo — All MFEs in One Repository

All applications and shared libraries live inside a single Git repository, managed with a tool like **Nx**.

```
company-platform/
├── apps/
│   ├── shell/
│   ├── mfe-react-app/
│   ├── mfe-angular-app/
│   └── mfe-dashboard/
└── libs/
    ├── auth-lib/
    ├── design-system/
    └── web-components/
```

**Use Monorepo when:**

_Team signals:_

| Situation                                   | Why it helps                                      |
| ------------------------------------------- | ------------------------------------------------- |
| All teams sit in the same organisation      | Shared PRs, shared reviews, shared standards      |
| Shared libraries change frequently          | One PR updates the lib and all consumers together |
| You want consistent tooling across all MFEs | Single `nx.json`, single lint/test config         |
| CI needs to build only what changed         | Nx `affected` builds — fast pipelines at scale    |
| Teams need to see each other's code         | Transparency, easy cross-team refactoring         |

_Project / Functional signals:_

| Situation                                 | Why it helps                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| MFEs share a tightly coupled domain model | Example: `OrderService` used by Cart MFE, Checkout MFE, and Invoice MFE |
| The design system evolves rapidly         | Every UI change must be reflected across all MFEs instantly             |
| You have a shared authentication flow     | Auth changes propagate to all MFEs in a single commit                   |
| All MFEs are part of one product release  | A v2.0 launch needs all features shipped together                       |
| You need enforced module boundaries       | Nx rules prevent MFE A importing directly from MFE B's internals        |

**Real-World Scenarios (Monorepo fits well):**

- **Large-scale developer platform** — Thousands of internal tools, infrastructure libraries, and UI components live in one repo. Shared tooling ensures consistent standards, and a single PR can update a utility used across hundreds of projects atomically.
- **Internal enterprise developer portal** — A plugin-based portal where all plugins are built by internal teams. Every plugin shares the same design system and API contracts. A broken contract is caught before it merges because everything is in one place.
- **Regulated banking platform** — Accounts MFE, Payments MFE, and Cards MFE all share the same customer domain model and regulatory data structures. A compliance change must reflect everywhere simultaneously — monorepo makes that a single PR.
- **Product suite with tight feature coupling** — Analytics dashboard, reporting engine, and data explorer MFEs share core charting components. Teams co-own the shared library and update it weekly together.

**Pros:**

| ✅ Pro                      | Detail                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| Single source of truth      | One place for all code, no version drift between MFEs             |
| Atomic changes              | Update shared lib and all MFEs in one PR — nothing is left behind |
| Unified CI/CD               | One pipeline, one set of lint and test rules for everyone         |
| Nx affected builds          | Only rebuild and retest what actually changed — fast at scale     |
| Easy cross-team refactoring | Rename a component once — it updates across all MFEs instantly    |
| Dependency graph visibility | Nx can show you exactly which MFE depends on what                 |

**Cons:**

| ❌ Con                      | Detail                                                               |
| --------------------------- | -------------------------------------------------------------------- |
| Repo grows large            | Without Nx, becomes slow to clone and search                         |
| Shared blast radius         | A bad lint rule or broken CI script affects all teams at once        |
| Coordination overhead       | Teams must agree on branching strategy, release process, and tooling |
| Ownership is blurred        | Anyone can technically edit any MFE — governance needed              |
| Harder for external vendors | Vendors cannot be given access to the full company repo              |

---

### Polyrepo — Each MFE in Its Own Repository

Every MFE is completely independent. Each team owns their own Git repo, their own CI/CD pipeline, and their own release schedule.

```
github.com/sudeep31/MFEDemo          ← Shell + manifest (monorepo)
github.com/sudeep31/angularTodo      ← Angular Todo (polyrepo MFE)
```

Each team owns their own Git repo, their own CI/CD pipeline, and their own release schedule.

**Use Polyrepo when:**

_Team signals:_

| Situation                                          | Why it helps                                     |
| -------------------------------------------------- | ------------------------------------------------ |
| Teams are in different departments or companies    | Hard boundaries, no shared repo access needed    |
| MFEs have very different release cycles            | Team A deploys 10x a day, Team B deploys monthly |
| A vendor or partner owns an MFE                    | They control their own repo entirely             |
| You want maximum team autonomy                     | No dependency on other teams to merge or release |
| MFEs are built in completely different tech stacks | No shared tooling assumptions                    |

_Project / Functional signals:_

| Situation                                         | Why it helps                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Each MFE is a standalone product                  | Example: a marketplace where each seller has their own storefront MFE |
| MFEs have no shared domain logic                  | Order MFE and HR MFE have nothing in common functionally              |
| An acquired company’s product is being integrated | Their codebase stays separate — connect via URL only                  |
| Different compliance or security zones            | Payment MFE under PCI-DSS, others under standard policy               |
| You need independent scaling of build pipelines   | High-traffic MFEs need their own optimised CI runners                 |

**Real-World Scenarios (Polyrepo fits well):**

- **Large e-commerce marketplace** — Product listing, checkout, recommendations, and seller portal are separate deployments owned by separate squads. Each team releases independently. The shell integrates them purely by URL — no shared codebase.
- **Media streaming platform with partner tools** — The consumer-facing app and the content-partner submission portal are completely separate products. The partner team deploys on their own schedule and their repo is never touched by the consumer team.
- **SaaS platform with ISV ecosystem** — The platform team owns the shell and manifest. Each Independent Software Vendor (ISV) builds and hosts their own plugin MFE in their own repo. The platform shell simply loads their `remoteEntry.js` URL — no repo access, no shared CI.
- **Post-acquisition product integration** — A company acquires another product. Rather than rewriting it, the acquired team keeps their own repo and tech stack. The shell loads their MFE by URL — integration without code coupling.

**Pros:**

| ✅ Pro                      | Detail                                                       |
| --------------------------- | ------------------------------------------------------------ |
| Maximum team autonomy       | Each team owns their full lifecycle — no waiting on others   |
| Hard boundaries             | Teams cannot accidentally break each other's code            |
| Vendor and partner friendly | External teams get their own repo, no internal access needed |
| Independent release cycles  | Deploy as fast or as slow as the business demands            |
| Technology freedom          | Each repo can use its own Node version, bundler, framework   |
| Simple per-team onboarding  | New developers only need to understand one small repo        |

**Cons:**

| ❌ Con                            | Detail                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| Version drift                     | Each repo upgrades shared libs on its own schedule — inconsistency risk |
| No unified CI view                | Hard to see the health of the whole platform at a glance                |
| Cross-repo refactoring is painful | A shared interface change requires PRs in every repo separately         |
| Duplication risk                  | Teams may duplicate utilities or components instead of sharing          |
| Higher operational overhead       | 50 repos = 50 CI pipelines, 50 dependency update PRs to manage          |

---

### Hybrid — Monorepo for Shared Libs, Polyrepo for MFEs

The most common real-world pattern. Shared libraries (auth, design system, web components) live in a central monorepo. Each product MFE lives in its own repo and consumes shared libs as **published npm packages**.

```
github.com/company/platform-libs     ← Auth, Design System, Web Components
    (published as @mfe/auth-lib, @mfe/design-system)

github.com/company/mfe-react-app     ← installs @mfe/auth-lib@1.2.0
github.com/company/mfe-angular-app   ← installs @mfe/auth-lib@1.2.0
github.com/company/mfe-dashboard     ← installs @mfe/auth-lib@1.2.0
```

**Use Hybrid when:**

_Team signals:_

| Situation                                           | Why it helps                                                |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Shared code is stable and versioned                 | Teams pin to a version, upgrade on their schedule           |
| MFE teams have different organisational ownership   | Each team controls their own repo and deploy                |
| You want design system consistency without coupling | Design system releases as versioned npm package             |
| Some MFEs are internal, some are third-party        | Internal teams use the libs; external vendors pin their own |
| You are migrating from a monolith gradually         | Extract MFEs one by one into their own repos                |

_Project / Functional signals:_

| Situation                                                         | Why it helps                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Core platform APIs are stable but product features change rapidly | Shared libs are versioned; product MFEs release freely                            |
| You have a design system team and separate product teams          | Design system team publishes npm packages; product teams consume them             |
| Some domains are regulated, others are not                        | Payment MFE uses pinned, audited auth-lib version; other MFEs upgrade freely      |
| You are building a white-label platform                           | Shell + shared libs are the platform; each client gets their own branded MFE repo |
| Multiple products share authentication but not UI                 | Auth-lib is central; each product has its own design and MFE repo                 |

**Real-World Scenarios (Hybrid fits well):**

- **Cloud management console** — A central design system is published as a versioned npm package. Each product area (compute, storage, networking, AI services) is a separate repo owned by a separate team. They consume the design system package and deploy their portal section independently.
- **Retail platform with regional storefronts** — Shared design tokens and a component library are published centrally. Each regional storefront (US, UK, India, Germany) is a separate repo that pins its own version of the shared library and deploys on a regional schedule.
- **Multi-product SaaS suite** — A platform team publishes `@platform/auth-lib` and `@platform/design-system` as npm packages. Each product (Admin, Analytics, Billing, Support) lives in its own repo, installs the packages, and releases freely without coordinating with other product teams.
- **Insurance or financial services platform** — `@company/design-system` and `@company/auth-lib` are owned by a platform team and versioned strictly. Quote MFE, Claims MFE, and Policy MFE are separate repos. The Payment MFE pins an audited, PCI-compliant version of auth-lib, while other MFEs upgrade freely.

**Pros:**

| ✅ Pro                      | Detail                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| Shared libs stay consistent | Design system and auth-lib are versioned and released centrally             |
| MFE teams stay autonomous   | Each MFE repo deploys independently on its own schedule                     |
| Vendor compatible           | External teams consume published npm packages — no repo access needed       |
| Gradual migration path      | Extract MFEs from a monolith one at a time without restructuring everything |
| Best of both worlds         | Central governance on shared code, freedom on product code                  |

**Cons:**

| ❌ Con                                    | Detail                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Version drift still possible              | MFE A on `@mfe/auth-lib@1.2`, MFE B on `@mfe/auth-lib@1.0` — needs discipline |
| Package registry required                 | Must set up npm, GitHub Packages, or Azure Artifacts to publish shared libs   |
| Two-step shared lib updates               | Change the lib → publish → each MFE bumps version → each MFE deploys          |
| Release coordination for breaking changes | A breaking change in auth-lib forces all MFE teams to upgrade together        |
| More complex initial setup                | More moving parts than pure monorepo or pure polyrepo                         |

---

### Decision Summary

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │               HOW TO CHOOSE YOUR REPO STRATEGY                      │
  ├──────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │  Q1: Are all MFE teams inside the same organisation?                │
  │                                                                      │
  │    YES ──► Q2: Do MFEs share tightly coupled domain logic?          │
  │                  │                                                   │
  │                  ├── YES ──► MONOREPO (Nx)                          │
  │                  │            Google, Meta, Spotify model            │
  │                  │                                                   │
  │                  └── NO  ──► Q3: Independent deploys needed?        │
  │                                   │                                  │
  │                                   ├── NO  ──► MONOREPO (Nx)         │
  │                                   │                                  │
  │                                   └── YES ──► HYBRID                │
  │                                               Microsoft Azure, IKEA │
  │                                                                      │
  │    NO  ──► Q4: External vendors or acquired teams involved?         │
  │                  │                                                   │
  │                  ├── YES ──► POLYREPO                               │
  │                  │            Amazon, Zalando, Netflix model         │
  │                  │                                                   │
  │                  └── NO  ──► HYBRID                                 │
  │                               Shopify, Insurance platform model     │
  └──────────────────────────────────────────────────────────────────────┘
```

|                          | Monorepo                                                             | Polyrepo                                                                    | Hybrid                                                                  |
| ------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Team structure           | One org, close collaboration                                         | Multiple orgs or vendors                                                    | Mixed — internal + external                                             |
| Domain coupling          | Tightly coupled domains                                              | Independent domains                                                         | Shared platform, separate products                                      |
| Shared lib updates       | Instant — one PR                                                     | Manual version bumps per repo                                               | Versioned npm releases                                                  |
| Release independence     | Low — coordinated                                                    | High — fully independent                                                    | Medium — MFEs independent                                               |
| Vendor / partner MFEs    | Not suitable                                                         | Best fit                                                                    | Supported via npm registry                                              |
| Design system            | Shared in same repo                                                  | Each team owns theirs                                                       | Published as versioned package                                          |
| Compliance / isolation   | Shared policies only                                                 | Full isolation per repo                                                     | Per-domain isolation possible                                           |
| Tooling complexity       | Medium (Nx manages it)                                               | Low per repo, high overall                                                  | Medium                                                                  |
| Best for scale           | Up to ~50 MFEs                                                       | Any scale                                                                   | 20–200+ MFEs                                                            |
| Real-world reference     | Developer portals, banking platforms, tightly coupled product suites | E-commerce marketplaces, SaaS ISV ecosystems, post-acquisition integrations | Cloud consoles, multi-region storefronts, regulated financial platforms |
| Recommended for this POC | Start here                                                           | Use for vendor MFEs                                                         | Evolve into this at scale                                               |

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
