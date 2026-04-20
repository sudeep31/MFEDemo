# MFE System — Architecture Overview

> **Scope**: This document describes the high-level system architecture for the MFEDemo POC — a Micro Frontend platform supporting polyrepo isolation, cross-framework composition, shared design system, and shared authentication.

---

## 1. System Context (C4 Level 1)

```mermaid
C4Context
    title System Context — MFE Platform

    Person(user, "End User", "Uses web applications via a browser")
    System(shell, "Shell (MFE Host)", "Loads, orchestrates and renders all Micro Frontend applications")
    System_Ext(oidc, "Identity Provider (OIDC)", "Issues JWT tokens. Mock for POC; Keycloak/Azure AD in production")
    System_Ext(cdn, "CDN / Static Hosts", "Hosts each MFE's remoteEntry.js and static assets independently")

    Rel(user, shell, "Navigates to", "HTTPS")
    Rel(shell, oidc, "Authenticates via", "OAuth2 / OIDC")
    Rel(shell, cdn, "Fetches MFE bundles from", "HTTPS / Module Federation")
```

---

## 2. Container Diagram (C4 Level 2)

```mermaid
C4Container
    title Container Diagram — MFE Platform

    Person(user, "End User")

    Container_Boundary(browser, "Browser") {
        Container(shell, "Shell App", "React + Webpack 5 Module Federation HOST", "Provides routing, layout, auth context, and dynamically loads MFE remotes")
        Container(manifest, "mfe-manifest.json", "JSON Config", "Registry mapping MFE names to their remoteEntry.js URLs")
        Container(authLib, "@mfe/auth-lib", "Federated Singleton (JS)", "Shared token store, getToken(), getUser(), onTokenExpiry()")
        Container(designSys, "@mfe/design-system", "SCSS / CSS Variables", "Bootstrap 5 overrides, design tokens — consumed by all MFEs")
        Container(webComps, "@mfe/web-components", "HTML Custom Elements", "Framework-agnostic UI components: mfe-button, mfe-header, mfe-nav")
    }

    Container_Boundary(polyrepos, "Polyrepo MFE Remotes (separate Git repos)") {
        Container(reactMfe, "mfe-react-app", "React + Webpack 5 MODULE FEDERATION REMOTE", "Exposes /remoteEntry.js — loaded by Shell at runtime")
        Container(angularMfe, "mfe-angular-app", "Angular + @angular-architects/module-federation REMOTE", "Exposes /remoteEntry.js — wrapped as Web Component for isolation")
        Container(vueMfe, "mfe-vue-app", "Vue 3 (Future)", "Exposes /remoteEntry.js")
    }

    Rel(user, shell, "Uses", "HTTPS")
    Rel(shell, manifest, "Reads at boot", "HTTP GET")
    Rel(shell, reactMfe, "Loads dynamically", "Module Federation / HTTPS")
    Rel(shell, angularMfe, "Loads dynamically", "Module Federation / HTTPS")
    Rel(shell, vueMfe, "Loads dynamically (future)", "Module Federation / HTTPS")
    Rel(reactMfe, authLib, "Consumes singleton", "Module Federation shared")
    Rel(angularMfe, authLib, "Consumes singleton", "Module Federation shared")
    Rel(reactMfe, designSys, "Imports SCSS", "npm / shared")
    Rel(angularMfe, designSys, "Imports SCSS", "npm / shared")
```

---

## 3. High-Level Data Flow

```mermaid
flowchart TD
    A([Browser opens Shell URL]) --> B[Shell boots]
    B --> C{Auth token present?}
    C -- No --> D[Redirect to Login / Mock OIDC]
    D --> E[Token issued → stored in auth-lib]
    C -- Yes --> E
    E --> F[Shell fetches mfe-manifest.json]
    F --> G[Parse MFE registry\nname → remoteEntry URL]
    G --> H[Shell renders layout + nav]
    H --> I{User navigates to route}
    I --> J[Shell looks up MFE name in manifest]
    J --> K[Dynamically import remoteEntry.js\nfrom remote URL]
    K --> L{Framework?}
    L -- React --> M[Mount React MFE component]
    L -- Angular --> N[Mount Angular as Web Component\ncustomElement.define]
    L -- Vue --> O[Mount Vue MFE component]
    M & N & O --> P[MFE renders inside Shell layout]
    P --> Q[MFE calls auth-lib.getToken\nfederated singleton — no extra login]
    Q --> R([User sees fully rendered MFE])
```

---

## 4. Repository & Deployment Layout

```mermaid
graph LR
    subgraph "This Repo — MFEDemo"
        SHELL["shell/\n(React Host App)"]
        DS["shared/design-system\n(Bootstrap 5 SCSS)"]
        WC["shared/web-components\n(Custom Elements)"]
        AL["shared/auth-lib\n(Token Store)"]
        MAN["shell/public/mfe-manifest.json\n(MFE Registry)"]
        DOCS["docs/\n(Architecture Docs)"]
    end

    subgraph "Polyrepo — mfe-react-app"
        RA["React App\n(Webpack MODULE REMOTE)"]
        RAR["remoteEntry.js\n(hosted at port 3001)"]
        RA --> RAR
    end

    subgraph "Polyrepo — mfe-angular-app"
        AA["Angular App\n(@angular-architects/module-federation)"]
        AAR["remoteEntry.js\n(hosted at port 4201)"]
        AA --> AAR
    end

    MAN -->|"{ reactApp: 'http://localhost:3001/remoteEntry.js' }"| RAR
    MAN -->|"{ angularApp: 'http://localhost:4201/remoteEntry.js' }"| AAR

    SHELL -->|reads| MAN
    SHELL -->|loads at runtime| RAR
    SHELL -->|loads at runtime| AAR
```

---

## 5. Shared Library Consumption Pattern

```mermaid
flowchart LR
    subgraph "Shared (published via npm or Module Federation shared)"
        DS["@mfe/design-system"]
        WC["@mfe/web-components"]
        AL["@mfe/auth-lib\n(singleton: true)"]
    end

    subgraph "Shell Host"
        SH["shell/webpack.config.js\nshared: { auth-lib: singleton }"]
    end

    subgraph "React MFE"
        RM["mfe-react-app/webpack.config.js\nshared: { auth-lib: singleton }"]
    end

    subgraph "Angular MFE"
        AM["mfe-angular-app/webpack.config.js\nshared: { auth-lib: singleton }"]
    end

    DS --> SH & RM & AM
    WC --> SH & RM & AM
    AL --> SH
    AL -.->|"reuses Shell's instance\n(no duplicate bundle)"| RM
    AL -.->|"reuses Shell's instance\n(no duplicate bundle)"| AM
```

---

## 6. Key Principles

| Principle                    | Implementation                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| **Polyrepo isolation**       | Each MFE is a separate Git repo; connected only via URL in `mfe-manifest.json`         |
| **No code copying**          | Module Federation loads `remoteEntry.js` at runtime — zero static imports across repos |
| **Framework agnostic Shell** | Shell only knows a URL and a DOM mount point; never imports MFE code directly          |
| **CSS isolation**            | MFEs mount inside named custom elements; Shadow DOM or CSS Modules prevent bleed       |
| **Resilience**               | Shell wraps each MFE in an error boundary — one crash doesn't cascade                  |
| **Scale to 50+ apps**        | Adding a new MFE = add one entry to `mfe-manifest.json`; zero Shell code changes       |
| **Auth no re-login**         | `auth-lib` shared as a federated singleton — one token store across all MFEs           |

---

## 7. Project Structure

```
MFEDemo/                          ← This repository
├── shell/
│   ├── src/
│   │   ├── app/                  ← Root layout, router outlet
│   │   ├── auth/                 ← Auth provider, guards, token storage
│   │   └── mfe-loader/           ← Dynamic import logic, error boundary
│   ├── public/
│   │   └── mfe-manifest.json     ← MFE registry (name → remoteEntry URL)
│   └── webpack.config.js         ← Module Federation HOST configuration
│
├── shared/
│   ├── design-system/            ← Bootstrap 5 SCSS + CSS custom properties
│   ├── web-components/           ← HTML Custom Elements (mfe-button, mfe-header)
│   └── auth-lib/                 ← getToken, getUser, onTokenExpiry
│
└── docs/                         ← Architecture Decision Records & diagrams
    ├── 01-architecture-overview.md       ← This file
    ├── 02-shell-framework-comparison.md  ← React vs Angular vs Vue vs Vanilla for Shell
    ├── 03-shell-framework-decision-adr.md← ADR: Final Shell framework choice
    ├── 04-module-federation-wiring.md    ← Module Federation deep-dive diagrams
    └── 05-auth-flow.md                   ← Authentication flow & token sharing design
```
