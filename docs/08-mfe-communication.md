# MFE Communication — Complete Guide

**How Micro Frontends talk to each other, to the Shell, and what you should — and must never — pass across boundaries**

---

## Why Communication Is Different in MFEs

In a regular SPA, components communicate through props, shared state (Redux, Zustand, NgRx), or a service layer — all living in the same runtime, built together, deployed together.

In a Micro Frontend architecture, each application is **deliberately isolated**. They may run different frameworks, different versions, different runtimes. There is no shared memory, no shared module graph, and no guarantee that a React context or an Angular service is visible across the boundary.

This means communication must be **explicit, typed, and narrow**. The boundary between MFEs is like an API surface — it needs to be designed, not assumed.

---

## The Three Channels

Regardless of your integration strategy, all MFE communication flows through one of three channels:

| Channel                | How it works                                     | When to use                                     |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------- |
| **Attributes / Props** | Data passed at mount time or via HTML attributes | Configuration, user identity, feature flags     |
| **Events**             | Custom DOM events or a shared event bus          | State changes, user actions, notifications      |
| **Shared Singleton**   | A module loaded exactly once, used by all        | Auth token, shared state, navigation, event bus |

The right channel depends on your integration strategy and the **direction** of the communication.

---

## Mental Model — The Communication Flows

```
┌─────────────────────────────────────────────────────┐
│                     Shell App                        │
│   Owns: routing, auth context, layout, global state  │
│                                                      │
│   ──── attributes/props ────►  MFE A (React)        │
│   ◄─── custom DOM event ──────  MFE A (React)       │
│                                                      │
│   ──── DOM property ────────►  MFE B (Angular WC)   │
│   ◄─── custom DOM event ──────  MFE B (Angular WC)  │
│                                                      │
│   ──── customProps ─────────►  MFE C (single-spa)   │
└─────────────────────────────────────────────────────┘
         ▲                   ▲
         │  shared singleton  │
         └────────────────────┘
              (event bus /
               auth store)
```

**Key rule:** MFE A must never import directly from MFE B's source. All cross-MFE communication goes through a **shared interface** — the Shell, DOM events, or a shared library. This is what preserves independent deployability.

---

## Strategy 1 — Web Components (Custom Events + Attributes)

Web Components communicate through **browser-native mechanisms only**. There is no React state, no Angular service — just DOM attributes, DOM properties, and custom events.

### Flow — Shell dispatches data to an Angular Web Component

```
Shell creates user object
        │
        ▼
Shell sets DOM property on <mfe-angular> element
        │
        ▼
Angular @Input() receives the object (Angular Elements maps it)
        │
        ▼
Angular MFE renders with the data
```

**Where to create — Shell side:**

```jsx
// React Shell — pass simple config via attribute (string only)
<angular-todo-app user-id={currentUser.id} theme="dark" />;

// React Shell — pass complex object via DOM property (after mount)
useEffect(() => {
  const el = document.querySelector("angular-todo-app");
  if (el) {
    el.config = {
      userId: currentUser.id,
      permissions: currentUser.permissions, // array — not an attribute
    };
  }
}, [currentUser]);
```

> **Rule:** HTML attributes are always strings. For anything that is not a string (objects, arrays, booleans, numbers), use a DOM property set via JavaScript.

**Where to receive — Angular MFE:**

```typescript
// Angular Web Component — inputs mapped by Angular Elements
@Component({ selector: 'app-root', ... })
export class AppComponent {
  @Input() userId: string;          // maps from attribute "user-id"
  @Input() config: AppConfig;       // maps from DOM property "config"
}
```

---

### Flow — Angular MFE notifies the Shell of an action

```
User completes action inside Angular MFE
        │
        ▼
Angular MFE dispatches CustomEvent on its host element
        │  (bubbles: true → event travels up the DOM tree)
        ▼
Shell's addEventListener catches the event at the parent level
        │
        ▼
Shell updates its own state / triggers navigation
```

**Where to create — Angular MFE:**

```typescript
// Angular service — dispatches a DOM event from the component's host element
@Injectable()
export class EventDispatchService {
  constructor(private hostEl: ElementRef) {}

  notifyShell(eventName: string, payload: unknown): void {
    this.hostEl.nativeElement.dispatchEvent(
      new CustomEvent(eventName, {
        detail: payload,
        bubbles: true, // travels up through the DOM
        composed: true, // crosses Shadow DOM boundary if used
      }),
    );
  }
}

// Usage — inside a component
this.eventDispatch.notifyShell("todo-created", {
  id: newTodo.id,
  title: newTodo.title,
  // ✅ pass: IDs, titles, status values
  // ❌ never pass: passwords, raw JWT tokens, credit card data, full user objects with PII
});
```

**Where to consume — React Shell:**

```jsx
// React Shell — listen on the custom element ref
const mfeRef = useRef(null);

useEffect(() => {
  const el = mfeRef.current;
  const handler = (e) => {
    console.log("Todo created:", e.detail);
    dispatch({ type: "ADD_TODO", payload: e.detail });
  };
  el?.addEventListener("todo-created", handler);
  return () => el?.removeEventListener("todo-created", handler);
}, []);

return <angular-todo-app ref={mfeRef} />;
```

---

### Flow — MFE A notifies MFE B without going through the Shell

When two MFEs need to communicate directly (e.g., a Product MFE tells a Cart MFE an item was added), use a **window-level event bus**:

```
MFE A (React) dispatches event on window.__mfeBus
        │
        ▼
window.__mfeBus is a shared EventTarget (set up once, lives on window)
        │
        ▼
MFE B (Vue) has a listener registered on window.__mfeBus
        │
        ▼
MFE B reacts to the event
```

**Where to create the bus — load once in Shell or shared package:**

```javascript
// shell/src/bootstrap.jsx — initialised before any MFE mounts
window.__mfeBus = window.__mfeBus || new EventTarget();
```

**Where to publish — any MFE:**

```javascript
// React MFE — product selected
window.__mfeBus.dispatchEvent(
  new CustomEvent("product:selected", {
    detail: { productId: "SKU-123", name: "Widget Pro" },
  }),
);
```

**Where to consume — any other MFE:**

```javascript
// Vue MFE — react to product selection
onMounted(() => {
  window.__mfeBus.addEventListener("product:selected", (e) => {
    loadProductDetails(e.detail.productId);
  });
});

onUnmounted(() => {
  window.__mfeBus.removeEventListener("product:selected", handler);
});
```

> **Always namespace your events** — use `domain:action` format (`cart:updated`, `auth:logout`, `nav:navigate`). This prevents two MFEs accidentally reacting to an event they didn't intend to.

**Web Component communication summary:**

| Direction   | Mechanism                          | Notes                                 |
| ----------- | ---------------------------------- | ------------------------------------- |
| Shell → MFE | HTML attribute                     | Strings only                          |
| Shell → MFE | DOM property                       | Objects/arrays — set after mount      |
| MFE → Shell | Custom DOM event (`bubbles: true`) | Shell listens with `addEventListener` |
| MFE ↔ MFE   | `window.__mfeBus` EventTarget      | Namespace all events                  |

---

## Strategy 2 — single-spa (Props + Shared Store)

single-spa passes data through **lifecycle props** at mount time. The Root Config is the single place that controls what every MFE receives.

### Flow — Root Config passes auth context to every MFE

```
User logs in → Shell updates authStore
        │
        ▼
Root Config's customProps function is called on each MFE mount
        │
        ▼
Each MFE's mount() lifecycle receives the latest props
        │
        ▼
MFE renders with auth context
```

**Where to create — Root Config:**

```javascript
// root-config.js — registers each MFE with its props
import { authStore } from "@mfe/auth-lib";

registerApplication({
  name: "@mfe/react-cart",
  app: () => import("@mfe/react-cart"),
  activeWhen: "/cart",
  customProps: {
    // Functions are called fresh each time the MFE mounts
    getAuthToken: () => authStore.getToken(), // ✅ function — always current
    userId: authStore.getUserId(), // ✅ scalar — fine at registration time
    onNavigate: (path) => singleSpa.navigateToUrl(path),
    // ❌ never pass: raw token strings as a static value (stale after refresh)
    // ❌ never pass: entire user objects with sensitive fields (PII exposure)
  },
});
```

**Where to consume — MFE lifecycle:**

```jsx
// react-cart/src/main.jsx
export async function mount(props) {
  const { getAuthToken, userId, onNavigate } = props;
  ReactDOM.render(
    <CartApp token={getAuthToken()} userId={userId} onNavigate={onNavigate} />,
    document.getElementById("mfe-cart-root"),
  );
}
```

---

### Flow — Cart MFE updates a count the Header MFE shows

```
User adds to cart → Cart MFE calls sharedStore.setState({ cartCount: 5 })
        │
        ▼
sharedStore notifies all subscribers (Header MFE, Shell, etc.)
        │
        ▼
Header MFE re-renders the cart badge
```

Because single-spa uses SystemJS import maps, `@mfe/shared-store` is loaded **once** — all MFEs get the exact same instance.

**The shared store — published as an import-map entry:**

```javascript
// @mfe/shared-store/index.js
let _state = { cartCount: 0, user: null, notifications: [] };
const _listeners = new Set();

export const sharedStore = {
  getState: () => ({ ..._state }), // return a copy — not the reference
  setState: (patch) => {
    _state = { ..._state, ...patch };
    _listeners.forEach((fn) => fn({ ..._state }));
  },
  subscribe: (fn) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn); // return unsubscribe function
  },
};
```

**Where to publish — Cart MFE:**

```javascript
import { sharedStore } from "@mfe/shared-store";

function addToCart(item) {
  const { cartCount } = sharedStore.getState();
  sharedStore.setState({ cartCount: cartCount + 1 });
  // ✅ pass: counts, status flags, IDs
  // ❌ never set: passwords, tokens, full payment objects in shared state
}
```

**Where to consume — Header MFE:**

```javascript
import { sharedStore } from "@mfe/shared-store";

let unsubscribe;

export function mount() {
  unsubscribe = sharedStore.subscribe((state) => {
    document.getElementById("cart-badge").textContent = state.cartCount;
  });
}

export function unmount() {
  unsubscribe?.(); // always clean up — prevents memory leaks
}
```

**single-spa communication summary:**

| Direction         | Mechanism                   | Notes                                          |
| ----------------- | --------------------------- | ---------------------------------------------- |
| Root Config → MFE | `customProps` at mount      | Functions for values that change (token, user) |
| MFE → Shell       | Shared singleton store      | Same instance via import map                   |
| MFE ↔ MFE         | Shared singleton store      | Best for reactive state                        |
| MFE ↔ MFE         | Window custom events        | Best for fire-and-forget signals               |
| Navigation        | `singleSpa.navigateToUrl()` | Prefer over `window.history` directly          |

---

## Strategy 3 — Webpack Module Federation / Monorepo

Module Federation allows MFEs to share modules at **runtime**. The `shared` config in webpack ensures that a singleton module (auth lib, event bus, React itself) is loaded exactly once across all MFEs.

### Flow — Shell passes auth context to a React MFE

```
Shell has AuthContext in React state
        │
        ▼
Shell lazy-loads ReactCartApp via Module Federation import
        │
        ▼
Shell passes userId and token as JSX props to ReactCartApp
        │
        ▼
CartApp renders — same React runtime, same context system
```

**Where to create — Shell:**

```jsx
// shell/src/App.jsx
const CartApp = React.lazy(() => import("reactCart/App"));

function App() {
  const { user, getToken } = useAuth();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CartApp
        userId={user.id}
        token={getToken()} // ✅ pass: token for API calls
        onCheckout={(cart) => handleCheckout(cart)} // ✅ pass: callback functions
        // ❌ never pass: user.password, user.ssn, raw secrets
      />
    </Suspense>
  );
}
```

**Where to consume — React Cart MFE:**

```jsx
// react-cart/src/App.jsx
export default function CartApp({ userId, token, onCheckout }) {
  // Token is available — use it only for API calls in this MFE
  // Never store it in localStorage or pass it on to a third-party script
  return <CartView userId={userId} onCheckout={onCheckout} />;
}
```

---

### Flow — Shell emits an event all MFEs react to (e.g., user logs out)

This is the most important cross-MFE flow. When the Shell handles a logout, **every mounted MFE needs to know**.

```
User clicks Logout → Shell calls authStore.logout()
        │
        ▼
Shell emits 'auth:logout' on the shared eventBus singleton
        │  (Module Federation shared config ensures one instance)
        ▼
React Cart MFE listener fires → clears local cart state
Vue MFE listener fires → clears local user data
Angular WC listener fires → dispatches DOM event upward
        │
        ▼
Shell completes redirect to /login
```

**Where to create — Shell:**

```javascript
// @mfe/event-bus — shared package, singleton via MF shared config
export const eventBus = {
  _emitter: new EventTarget(),
  on: (name, fn) => eventBus._emitter.addEventListener(name, fn),
  off: (name, fn) => eventBus._emitter.removeEventListener(name, fn),
  emit: (name, detail) =>
    eventBus._emitter.dispatchEvent(new CustomEvent(name, { detail })),
};
```

```javascript
// webpack.config.js — Shell and ALL MFEs must declare it shared
shared: {
  '@mfe/event-bus': { singleton: true, eager: true },
  '@mfe/auth-lib':  { singleton: true, eager: true },
  react:            { singleton: true, requiredVersion: '^19.0.0' },
}
```

```javascript
// shell/src/auth/Login.jsx
import { eventBus } from "@mfe/event-bus";

function handleLogout() {
  authStore.logout();
  eventBus.emit("auth:logout", { reason: "user-initiated" });
  // ✅ emit: reason, timestamp, userId (for logging)
  // ❌ never emit: the token itself, passwords, sensitive session data
}
```

**Where to consume — any MFE:**

```jsx
// react-cart/src/App.jsx
import { eventBus } from "@mfe/event-bus";

useEffect(() => {
  const handleLogout = () => {
    clearCart(); // wipe local state
    setUserId(null);
  };
  eventBus.on("auth:logout", handleLogout);
  return () => eventBus.off("auth:logout", handleLogout); // clean up on unmount
}, []);
```

```javascript
// vue-mfe/src/main.js
import { eventBus } from "@mfe/event-bus";

onMounted(() => eventBus.on("auth:logout", clearUserData));
onUnmounted(() => eventBus.off("auth:logout", clearUserData));
```

**Module Federation communication summary:**

| Direction             | Mechanism                                 | Notes                                         |
| --------------------- | ----------------------------------------- | --------------------------------------------- |
| Shell → React/Vue MFE | Direct JSX/template props                 | Works because runtime is shared               |
| Shell → Angular MFE   | DOM property / attribute                  | Different runtime — Web Component pattern     |
| MFE ↔ MFE (same FW)   | Shared singleton via `shared` config      | MF loads it once                              |
| MFE ↔ MFE (cross-FW)  | Window custom events or `window.__mfeBus` | Browser-native                                |
| All MFEs (broadcast)  | Shared `@mfe/event-bus` singleton         | Loaded once via MF shared — cleanest solution |
| Angular MFE → Shell   | DOM CustomEvent (`bubbles: true`)         | Shell listens on the element ref              |

---

## What to Pass — and What Never to Pass

This is the most critical section. A poorly designed communication contract breaks security, degrades performance, and couples MFEs in ways that are hard to untangle.

### ✅ Safe to Pass

| Type                      | Examples                              | Why it's safe                                                 |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Opaque identifiers**    | `userId`, `orderId`, `sessionId`      | No PII — just a key for the MFE to look up data itself        |
| **Role/permission flags** | `{ canEdit: true, isAdmin: false }`   | Coarse-grained — MFE uses it for UI decisions only            |
| **Callback functions**    | `onCheckout`, `onNavigate`, `onError` | MFE calls back to Shell — Shell controls the action           |
| **Feature flags**         | `{ showBeta: true }`                  | UI toggles — no sensitive data                                |
| **Token getter function** | `() => authStore.getToken()`          | Function reference — token fetched fresh, not stored in props |
| **Status/count values**   | `cartCount`, `notificationCount`      | Aggregated — no raw data                                      |
| **Event signals**         | `{ type: 'cart:updated', count: 3 }`  | Describe what happened — not the full data model              |

### ❌ Never Pass

| Type                                  | Examples                               | Why it's dangerous                                                                               |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Raw auth tokens as strings**        | `token: 'eyJ...'` in props/attributes  | Token leaks into DOM attributes (visible in DevTools) — use a getter function instead            |
| **Passwords or secrets**              | `password`, `apiKey`, `secret`         | Self-evident — never cross any boundary                                                          |
| **Full user objects with PII**        | `{ name, email, ssn, dob, address }`   | Minimum necessary — pass only what the MFE actually needs                                        |
| **Entire Redux/NgRx state trees**     | `store.getState()`                     | Performance: large object on every render; coupling: MFE is now aware of your entire state shape |
| **DOM references or React internals** | `ref`, `_owner`, `__reactFiber`        | Framework internals — break when framework version changes                                       |
| **Database records**                  | Raw API response objects               | Pass IDs — let the MFE fetch its own data for its own domain                                     |
| **Sensitive event payloads**          | `auth:login` event with `{ password }` | Event detail is observable — keep it opaque                                                      |

> **The minimum necessary rule:** pass only the data the receiving MFE needs to do its job. If you are passing a full user object and the MFE only uses the `id`, you are passing too much.

---

## Security Considerations

### DOM attributes are public

HTML attributes are visible to anyone opening the browser DevTools. **Never set sensitive data as attributes.**

```jsx
// ❌ Wrong — token is visible in the DOM
<angular-todo-app auth-token="eyJhbGciOiJIUzI1NiIs..." />;

// ✅ Correct — set via JS property, not visible in the DOM
useEffect(() => {
  el.authConfig = { getToken: () => authStore.getToken() };
}, []);
```

### Custom events are observable

Any script on the page can listen to `window` events. Do not put sensitive payload in event details.

```javascript
// ❌ Wrong — token in event detail
window.__mfeBus.dispatchEvent(
  new CustomEvent("auth:login", {
    detail: { token: rawJwt, password: "hunter2" },
  }),
);

// ✅ Correct — pass only what the consumer needs
window.__mfeBus.dispatchEvent(
  new CustomEvent("auth:login", {
    detail: { userId: "123", sessionId: "abc" },
  }),
);
```

### Shared singletons are shared

If you put sensitive data into a shared store, every MFE — including any third-party MFE you may add later — can read it.

```javascript
// ❌ Wrong — raw token in shared state
sharedStore.setState({ token: rawJwt, refreshToken: "..." });

// ✅ Correct — expose only a getter function
sharedStore.setState({ getToken: () => authLib.getToken() });
```

### Cross-Origin MFEs

If your MFEs are served from different origins (polyrepo/CDN deployment), postMessage is the secure cross-origin communication channel — not shared `window` objects.

```javascript
// Shell → cross-origin MFE (in an iframe or separate origin)
const mfeFrame = document.getElementById("mfe-frame");
mfeFrame.contentWindow.postMessage(
  { type: "auth:context", userId: user.id }, // ✅ safe scalar
  "https://trusted-mfe.example.com", // ✅ always specify target origin
);
```

---

## Performance Considerations

### Never pass large objects on every render

```jsx
// ❌ Wrong — entire product catalogue passed as a prop
<ProductMFE catalogue={allProducts} />   // potentially thousands of items

// ✅ Correct — pass an ID; let the MFE fetch its own data
<ProductMFE categoryId={selectedCategoryId} />
```

### Always unsubscribe from event listeners

Every `addEventListener` that is not removed is a memory leak. MFEs mount and unmount — clean up every listener in the unmount lifecycle.

```javascript
// single-spa — always clean up
export function unmount() {
  eventBus.off("auth:logout", handleLogout);
  sharedStore.unsubscribe(storeListener);
}

// React — always return cleanup from useEffect
useEffect(() => {
  eventBus.on("auth:logout", handleLogout);
  return () => eventBus.off("auth:logout", handleLogout);
}, []);
```

### Avoid high-frequency events

Events fired on every keystroke, scroll, or mouse-move can saturate the event bus. Debounce or throttle before emitting.

```javascript
// ❌ Wrong — fires on every keystroke
input.addEventListener("input", (e) =>
  eventBus.emit("search:query", { q: e.target.value }),
);

// ✅ Correct — debounced
const emitSearch = debounce((q) => eventBus.emit("search:query", { q }), 300);
input.addEventListener("input", (e) => emitSearch(e.target.value));
```

---

## Modularity — Keeping MFEs Independent

### Never import directly from another MFE

```javascript
// ❌ Wrong — direct cross-MFE import (tight coupling)
import { cartReducer } from "reactCart/store";

// ✅ Correct — use a shared library
import { cartStore } from "@mfe/cart-lib";
```

### Event contracts are your API

Treat every event name and its payload shape as a **public API**. Once an MFE subscribes to `product:selected` and expects `{ productId, name }`, changing the shape is a breaking change.

- Document your events in a shared `events.d.ts` or a contract file
- Version major changes: `product:selected:v2` rather than silently changing the payload
- Validate payloads at the consumer — do not assume the producer is trustworthy

### One MFE, one domain

Each MFE should own its own state. The shared store / event bus is for **signals** — not for replying to data the MFE should be fetching itself.

```javascript
// ❌ Wrong — Shell tells the Cart MFE exactly what's in the cart
sharedStore.setState({ cartItems: [...allCartItems] });

// ✅ Correct — Cart MFE owns its own data, Shell only signals
eventBus.emit("cart:refresh"); // signal — Cart MFE fetches its own data
```

---

## Quick Decision Guide

**What communication mechanism should I use?**

- Shell → same-framework MFE (React to React, Vue to Vue)
  → **Direct props / JSX** (simplest, no overhead)

- Shell → Angular Web Component MFE
  → **DOM property** for objects, **HTML attribute** for strings

- MFE → Shell (notify about action)
  → **Custom DOM event** with `bubbles: true` (Web Components)
  → **Shared store setState** (single-spa / Module Federation)

- MFE ↔ MFE (same page, any framework)
  → **Shared event bus singleton** (`window.__mfeBus` or `@mfe/event-bus`)

- Broadcast to all MFEs at once (auth:logout, theme:change)
  → **Shared event bus** — emit once, all subscribers react

- Cross-origin MFEs (different domains)
  → **postMessage** with explicit target origin

- Passing auth token
  → **Never as a string in props/attributes** — always a getter function

- Navigation from inside an MFE
  → `singleSpa.navigateToUrl()` (single-spa) or `window.history.pushState()` (Module Federation)

---

## Reference

- [Module Federation Wiring](https://github.com/sudeep31/MFEDemo/blob/main/docs/04-module-federation-wiring.md) — how the Shell and remotes are configured
- [Auth Flow](https://github.com/sudeep31/MFEDemo/blob/main/docs/05-auth-flow.md) — how the auth token is created, stored, and shared
- [single-spa + Nx Workspace Plan](https://github.com/sudeep31/MFEDemo/blob/main/docs/06-single-spa-nx-workspace-plan.md) — how single-spa lifecycle props are structured
- [Architecture Overview](https://github.com/sudeep31/MFEDemo/blob/main/docs/01-architecture-overview.md) — the full picture of all MFEs
