# Authentication Design — Shared Auth Across All MFEs

> **Purpose**: Define how authentication (JWT token management, login flow, token sharing) works across the Shell and all polyrepo MFEs — ensuring a single sign-on experience with no re-login between MFEs.

---

## 1. Auth Requirements

| #   | Requirement                                                                         | Priority |
| --- | ----------------------------------------------------------------------------------- | -------- |
| 1   | User logs in once — all MFEs (React, Angular, Vue) see the same authenticated state | Critical |
| 2   | JWT token must be accessible from any MFE regardless of framework                   | Critical |
| 3   | Token expiry / refresh must be handled centrally — MFEs do not manage refresh logic | Critical |
| 4   | Auth library must not be bundled twice (once in Shell, once in each MFE)            | High     |
| 5   | POC uses mock JWT; architecture must be OIDC-ready (Keycloak, Azure AD, Auth0)      | High     |
| 6   | MFEs must not store tokens themselves — they only read from the shared store        | High     |
| 7   | On logout, all MFEs must reflect logged-out state                                   | Medium   |

---

## 2. Auth Architecture Overview

```mermaid
flowchart TD
    subgraph "Shell (Host)"
        AP["AuthProvider\n(React Context at root)"]
        AL["@mfe/auth-lib\n(federated singleton)\ngetToken()\ngetUser()\nlogout()\nonTokenExpiry(cb)"]
        TS["Token Store\n(in-memory + sessionStorage)\nno localStorage for security"]
        RF["Silent Token Refresh\n(setInterval before expiry)"]

        AP --> AL
        AL --> TS
        AL --> RF
    end

    subgraph "React MFE (polyrepo)"
        RM_HOOK["useAuth() hook\n(consumes Shell's React Context OR\ncalls auth-lib directly)"]
        RM_API["Axios/Fetch interceptor\nattaches Bearer token\nfrom auth-lib.getToken()"]
        RM_HOOK --> RM_API
    end

    subgraph "Angular MFE (polyrepo)"
        AM_SVC["AuthBridgeService\n(Angular Injectable)\ncalls auth-lib.getToken()"]
        AM_INT["Angular HTTP Interceptor\nattaches Bearer token"]
        AM_SVC --> AM_INT
    end

    AL -->|"Module Federation\nshared singleton"| RM_HOOK
    AL -->|"Module Federation\nshared singleton"| AM_SVC
```

---

## 3. Token Storage Decision

```mermaid
flowchart TD
    Q1{Where to store JWT?}
    Q1 --> LS["localStorage\n❌ Rejected"]
    Q1 --> SS["sessionStorage\n⚠️ Partial"]
    Q1 --> MEM["In-Memory (JS variable)\n✅ Primary"]
    Q1 --> COOKIE["HttpOnly Cookie\n✅ Best for production"]

    LS --> LS_REASON["Vulnerable to XSS —\nany injected script can read tokens\nOWASP: do not store tokens in localStorage"]
    SS --> SS_REASON["Safer than localStorage\nbut lost on tab close\nuse only for tab-session continuity"]
    MEM --> MEM_REASON["XSS cannot access JS memory\nfrom injected script context\nLost on page refresh — use refresh token to restore"]
    COOKIE --> COOKIE_REASON["Server sets HttpOnly, Secure, SameSite=Strict\nJavaScript cannot read it\nBest security — requires backend BFF"]

    style LS fill:#ef4444,color:#fff
    style MEM fill:#22c55e,color:#fff
    style COOKIE fill:#22c55e,color:#fff
    style SS fill:#f59e0b,color:#fff
```

**POC Decision**: In-memory storage (JS variable in auth-lib). On page refresh, re-authenticate silently via refresh token (mocked in POC).  
**Production Decision**: HttpOnly Cookie via a Backend-for-Frontend (BFF) pattern.

---

## 4. Login / Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Shell
    participant AuthLib as @mfe/auth-lib
    participant MockOIDC as Mock OIDC (POC) / Real IdP (Prod)
    participant MFE as Any MFE

    User->>Shell: Navigate to app (first visit)
    Shell->>AuthLib: isAuthenticated()?
    AuthLib-->>Shell: false (no token in memory)

    Shell->>Shell: Render <LoginPage />
    User->>Shell: Submit credentials (username/password)
    Shell->>MockOIDC: POST /token (client_credentials or password grant)
    MockOIDC-->>Shell: { access_token, refresh_token, expires_in }

    Shell->>AuthLib: setToken(access_token, refresh_token, expiresIn)
    AuthLib->>AuthLib: Store in memory\nSchedule refresh at (expiresIn - 60s)
    AuthLib-->>Shell: token stored

    Shell->>Shell: Render main app layout
    Shell->>Shell: Fetch mfe-manifest.json
    Shell->>Shell: Load MFE via Module Federation

    MFE->>AuthLib: getToken()
    AuthLib-->>MFE: access_token (same instance — no re-login)
    MFE->>MFE: Attach token to API requests
```

---

## 5. Silent Token Refresh Flow

```mermaid
sequenceDiagram
    participant Timer as setInterval (auth-lib)
    participant AuthLib as @mfe/auth-lib
    participant IdP as Identity Provider
    participant Shell
    participant MFE as All MFEs

    Note over Timer: Token expires in 60s — trigger refresh
    Timer->>AuthLib: refreshToken()
    AuthLib->>IdP: POST /token (grant_type=refresh_token)
    IdP-->>AuthLib: { new access_token, new refresh_token }

    AuthLib->>AuthLib: Update in-memory token
    AuthLib->>AuthLib: Reset refresh timer

    Note over MFE: Next API call uses new token automatically
    MFE->>AuthLib: getToken()
    AuthLib-->>MFE: new access_token

    alt Refresh fails (session expired)
        IdP-->>AuthLib: 401 Unauthorized
        AuthLib->>AuthLib: clearToken()
        AuthLib->>Shell: notify via onTokenExpiry callback
        Shell->>Shell: Redirect to Login page
        Note over MFE: MFEs see isAuthenticated() = false\nrender fallback UI
    end
```

---

## 6. auth-lib Module Design

```mermaid
classDiagram
    class AuthLib {
        -string accessToken
        -string refreshToken
        -number expiresAt
        -Function[] tokenExpiryCallbacks
        -number refreshTimerId

        +setToken(accessToken, refreshToken, expiresIn) void
        +getToken() string
        +getUser() UserProfile
        +isAuthenticated() boolean
        +logout() void
        +onTokenExpiry(callback) unsubscribeFn
        -scheduleRefresh() void
        -doRefresh() Promise
        -notifyExpiry() void
    }

    class UserProfile {
        +string sub
        +string email
        +string name
        +string[] roles
    }

    AuthLib --> UserProfile : decodes from JWT
```

### auth-lib Public API (TypeScript)

```ts
// shared/auth-lib/src/index.ts

export interface UserProfile {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

export const authLib = {
  setToken(accessToken: string, refreshToken: string, expiresIn: number): void,
  getToken(): string | null,
  getUser(): UserProfile | null,
  isAuthenticated(): boolean,
  logout(): void,
  onTokenExpiry(callback: () => void): () => void,  // returns unsubscribe fn
};

// React hook (only usable inside React MFEs)
export function useAuth(): { user: UserProfile | null; token: string | null; logout: () => void }
```

---

## 7. Cross-Framework Auth Consumption

```mermaid
flowchart TD
    AL["@mfe/auth-lib\n(federated singleton)"]

    subgraph "React MFE — Option A: React Context"
        CTX["Shell's AuthContext\n(React.createContext)\nprovided via Module Federation"]
        HOOK["useAuth() hook\n(consumes context)"]
        CTX --> HOOK
    end

    subgraph "React MFE — Option B: Direct Import"
        RI["import { authLib } from '@mfe/auth-lib'\nauthLib.getToken()"]
    end

    subgraph "Angular MFE"
        AS["AuthBridgeService\n(@Injectable({ providedIn: 'root' }))\nimports authLib from '@mfe/auth-lib'\n(Module Federation shared)"]
        AI["HTTP Interceptor\nif (!token) redirect to login-event\nelse set Authorization header"]
        AS --> AI
    end

    subgraph "Vue MFE"
        VP["Pinia store / composable\nimports authLib from '@mfe/auth-lib'\nprovides reactive user ref"]
    end

    AL -->|"singleton instance\n(not re-bundled)"| CTX
    AL -->|"singleton instance"| RI
    AL -->|"singleton instance"| AS
    AL -->|"singleton instance"| VP
```

**Rule**: Every MFE imports `@mfe/auth-lib` via `import { authLib } from '@mfe/auth-lib'`. Because Module Federation resolves this to the Shell's singleton instance, every call to `authLib.getToken()` returns the same token from the same in-memory store.

---

## 8. Logout Flow (Cross-MFE)

```mermaid
sequenceDiagram
    participant User
    participant Shell
    participant AuthLib as @mfe/auth-lib (singleton)
    participant ReactMFE
    participant AngularMFE

    User->>Shell: Click "Logout"
    Shell->>AuthLib: logout()
    AuthLib->>AuthLib: clearToken()\nclearRefreshTimer()\nnotifyExpiry callbacks

    AuthLib-->>ReactMFE: onTokenExpiry callback fires\nisAuthenticated() = false
    AuthLib-->>AngularMFE: onTokenExpiry callback fires\nisAuthenticated() = false

    ReactMFE->>ReactMFE: Render <UnauthenticatedState />
    AngularMFE->>AngularMFE: Render unauthenticated state

    Shell->>Shell: Redirect to /login
    Note over ReactMFE, AngularMFE: All MFEs cleared simultaneously\n— single sign-out
```

---

## 9. OIDC-Ready Interface

The POC uses a mock token issuer. The architecture is designed so that switching to a real OIDC provider (Keycloak, Azure AD B2C, Auth0) requires changing only `auth-lib` internals — the public API stays identical.

```mermaid
flowchart LR
    subgraph "POC"
        MOCK["Mock OIDC Server\n(hardcoded JWT, no real IdP)"]
    end

    subgraph "Production"
        REAL["Real IdP\n(Keycloak / Azure AD / Auth0)\nOIDC Authorization Code + PKCE"]
    end

    subgraph "auth-lib (same public API)"
        API["getToken()\ngetUser()\nisAuthenticated()\nlogout()\nonTokenExpiry()"]
    end

    subgraph "All MFEs"
        MFE["No changes needed\nsame import, same API calls"]
    end

    MOCK -->|"setToken()"| API
    REAL -->|"setToken() via PKCE callback"| API
    API --> MFE
```

**Migration path**: Replace `auth-lib/src/oidcClient.ts` (the POC mock) with a real OIDC client library (e.g., `oidc-client-ts`). All MFEs remain unchanged.

---

## 10. Security Considerations

| Threat                                        | Mitigation                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| XSS reads token from storage                  | Token in JS memory only — not in `localStorage`. `HttpOnly` cookies in production        |
| CSRF with cookies                             | `SameSite=Strict` on auth cookie + CSRF token for state-mutating requests                |
| Token leaked via URL                          | Never pass tokens in query strings or URL fragments                                      |
| MFE loads with stale token                    | auth-lib's `onTokenExpiry` callback triggers — MFE renders unauthenticated state         |
| Duplicate auth-lib bundles (two token stores) | `singleton: true` in all MFE webpack configs — enforced via shared scope negotiation     |
| MFE accesses another MFE's data               | Each MFE only uses its own API — auth token is scoped to the user, not to MFE boundaries |
