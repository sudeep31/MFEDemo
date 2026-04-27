# Micro Frontend Architecture — At a Glance

**Quick reference covering: When to use MFE · Repo strategy · Integration · Communication · Auth · Scale · Tooling**

---

## When to Use MFE

| Use MFE when...                                            | Do NOT use MFE when...                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| Multiple teams need independent deployments                | Single team, single product                                     |
| Different sections have different release cadences         | All modules release together by design                          |
| You must integrate an external vendor or acquired app      | No compliance or isolation requirements                         |
| A legacy section must be rewritten without freezing others | Less than 3–5 teams working on the same frontend                |
| Compliance isolation required (PCI-DSS, HIPAA, SOC 2)      | A modular monolith with clear internal boundaries already works |

---

## Repo Strategy — Choose Based on Org Structure

| Strategy          | Best for                                                     | Key benefit                                                | Watch out for                  |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------ |
| **Monorepo (Nx)** | All teams internal, same CI platform                         | Atomic shared-lib changes, `nx affected` keeps CI fast     | Opinionated structure          |
| **Polyrepo**      | External vendors, acquired apps, strict compliance isolation | Full isolation — Shell loads by URL only, zero shared code | Version drift across repos     |
| **Hybrid**        | Mix of internal teams + regulated/external parts             | Internal core in monorepo, regulated MFEs in own repos     | Two-step lib update discipline |

---

## Integration Patterns — Three Approaches

| Approach                      | How it works                                             | Best for                                         | Limitation                                                   |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| **Webpack Module Federation** | MFEs share modules at runtime via `remoteEntry.js`       | Same or mixed frameworks, monorepo               | Same federation protocol required                            |
| **Web Components**            | MFE registers as a custom HTML element (`<mfe-angular>`) | Different frameworks, polyrepo, external vendors | Attributes are strings only; async bootstrap adds ~100–300ms |
| **single-spa**                | Framework-agnostic `bootstrap/mount/unmount` lifecycle   | 20+ MFEs, mixed frameworks at scale              | SystemJS + adapters — steeper learning curve                 |

---

## Communication — By Strategy

| Direction   | Web Components                                  | single-spa                             | Module Federation                                      |
| ----------- | ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| Shell → MFE | HTML attribute (string) / DOM property (object) | `customProps` at `registerApplication` | Direct JSX props (same FW) / DOM property (Angular WC) |
| MFE → Shell | Custom DOM event `bubbles: true`                | Shared singleton store                 | Shared event bus (`@mfe/event-bus`)                    |
| MFE ↔ MFE   | `window.__mfeBus` EventTarget                   | Shared store or window custom events   | Shared singleton via `shared` config                   |

**Pass:** opaque IDs · role flags · callback functions · token getter functions · event signals
**Never pass:** raw token strings · passwords · full PII objects · entire state trees · framework internals

---

## Auth — Shared Singleton Pattern

```
Shell authenticates → stores token in @mfe/auth-lib (singleton)
     ↓
webpack shared: { '@mfe/auth-lib': { singleton: true, eager: true } }
     ↓
Every MFE calls authLib.getToken() → same instance → same token
     ↓
Token refresh / logout → all MFEs update automatically
```

---

## Scale Guide — When to Add What

| MFE Count | Setup                                    | Key addition                                                |
| --------- | ---------------------------------------- | ----------------------------------------------------------- |
| 1 – 20    | Custom React Shell + `mfe-manifest.json` | Webpack Module Federation + Web Components                  |
| 20 – 50   | + Nx workspace                           | `nx affected` CI, module boundary enforcement, visual graph |
| 50+       | + single-spa orchestration               | `bootstrap/mount/unmount` lifecycle, SystemJS import maps   |

---

## Workspace Tooling — Quick Pick

| Tool                | Pick it when...                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **Nx**              | You need MFE generators, Module Federation plugin, boundary rules, visual graph |
| **Turborepo**       | You want fast caching only — React/Next.js stack, free Vercel remote cache      |
| **pnpm Workspaces** | Foundation layer for strict dependency isolation under Nx or Turborepo          |
| **Lerna**           | Hybrid strategy — publishing shared libs to npm with versioned changelogs       |
| **Rush**            | Enterprise — 500+ packages, compliance governance, supply-chain controls        |
| **Bazel**           | Polyglot at Google scale — JS + Java + Go + Python, 10,000+ build targets       |

---

## Angular 21 in This MFE Platform

| Feature                                                   | What it enables                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `createApplication()` instead of `bootstrapApplication()` | Angular starts without claiming a DOM element — host controls placement  |
| `@angular/elements` + `customElements.define()`           | Exposes Angular component as a standard HTML tag any host can render     |
| Zoneless (`provideZonelessChangeDetection()`)             | No Zone.js — no monkey-patching, no conflict with React/Vue in same tab  |
| Signals                                                   | Fine-grained reactivity — component updates only when its signal changes |
| Expose feature component, not App root                    | Avoids Angular router fighting the Shell router for URL ownership        |

---

## This Project's Stack

| Layer                   | Technology                                                              | Port |
| ----------------------- | ----------------------------------------------------------------------- | ---- |
| Shell                   | React 19 + Webpack 5 Module Federation                                  | 3000 |
| React MFE               | React 19 + Webpack Module Federation remote                             | 3001 |
| Vue MFE                 | Vue 3 + Webpack Module Federation remote                                | 3002 |
| Angular MFE (monorepo)  | Angular 21 Zoneless + Native Federation → Web Component `<mfe-angular>` | 4201 |
| Angular Todo (polyrepo) | Angular 21 + Native Federation → Web Component `<angular-todo-app>`     | 4200 |
| Auth Server             | JSON Server                                                             | 3100 |

**Source:** https://github.com/sudeep31/MFEDemo · **Polyrepo MFE:** https://github.com/sudeep31/angularTodo
**Full communication guide:** https://github.com/sudeep31/MFEDemo/blob/main/docs/08-mfe-communication.md
