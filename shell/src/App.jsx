import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import { getActiveRemotes } from "./mfe-registry";

// ─── Webpack Module Federation remotes (build-time declared) ──────────────────
// These lazy imports must match the keys in ModuleFederationPlugin.remotes.
// The URLs come from mfe.manifest.json → webpack.config.js at build time.
const ReactApp = lazy(() => import("reactApp/App"));
const VueApp = lazy(() => import("vueApp/App"));

const webpackMfComponents = {
  reactApp: ReactApp,
  vueApp: VueApp,
};

// ─── Framework → Bootstrap colour mapping ────────────────────────────────────
const frameworkColour = {
  react: "primary",
  vue: "success",
  angular: "danger",
};

// ─── Generic loader for Native Federation MFEs exposed as Web Components ─────
// Works for ANY Angular remote that exposes a custom element.
// Config comes entirely from mfe.manifest.json — no hardcoded URLs here.
function NativeFederationMfe({ config }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const { webComponent, remoteEntry } = config;

    if (customElements.get(webComponent)) {
      setStatus("ready");
      return;
    }

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.type = "module";
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

    loadScript(remoteEntry)
      .then(() =>
        customElements.get(webComponent)
          ? Promise.resolve()
          : customElements.whenDefined(webComponent)
      )
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));
  }, [config]);

  if (status === "error") {
    const port = (() => { try { return new URL(config.remoteEntry).port; } catch { return "?"; } })();
    return (
      <div className="alert alert-danger m-4">
        <strong>{config.displayName}</strong> failed to load. Is it running on port {port}?
        {config.repo === "polyrepo" && (
          <div className="mt-1 small text-muted">
            Polyrepo — start it separately from: <code>{config.repoPath}</code>
          </div>
        )}
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading {config.displayName}…</span>
        </div>
      </div>
    );
  }

  return React.createElement(config.webComponent, {
    style: { display: "block", padding: "1rem" },
  });
}



// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger m-4">
          <strong>{this.props.name}</strong> crashed. Check the browser console.
        </div>
      );
    }
    return this.props.children;
  }
}

function MfeLoader({ children, name }) {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading {name}…</span>
          </div>
        </div>
      }
    >
      <ErrorBoundary name={name}>{children}</ErrorBoundary>
    </Suspense>
  );
}

// ─── Navigation — generated from the active registry ─────────────────────────
function Navbar() {
  const { user, logout } = useAuth();
  const remotes = getActiveRemotes();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <span className="navbar-brand">MFE Shell</span>
        <div className="navbar-nav me-auto">
          <NavLink className="nav-link" to="/">Home</NavLink>
          {remotes.map((r) => (
            <NavLink key={r.key} className="nav-link" to={r.route}>
              {r.displayName}
              {r.repo === "polyrepo" && (
                <span className="badge bg-warning text-dark ms-1" style={{ fontSize: "0.6rem" }}>
                  ext
                </span>
              )}
            </NavLink>
          ))}
        </div>
        {user && (
          <div className="d-flex align-items-center">
            <span className="text-light me-3">Hello, {user.name}</span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Home — cards generated from the registry ────────────────────────────────
function Home() {
  const remotes = getActiveRemotes();

  return (
    <div className="container mt-4">
      <div className="jumbotron p-4 bg-light rounded">
        <h1 className="display-5">MFE Demo Platform</h1>
        <p className="lead">
          React 19 shell loading Micro Frontends via Webpack Module Federation (React, Vue) and
          Native Federation + Web Components (Angular). Driven by <code>mfe.manifest.json</code>.
        </p>
        <hr />
        <div className="row">
          {remotes.map((r) => (
            <div key={r.key} className="col-md-3 mb-3">
              <div className="card h-100">
                <div
                  className={`card-header bg-${frameworkColour[r.framework] || "secondary"} text-white`}
                  style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {r.framework} · {r.repo}
                </div>
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{r.displayName}</h5>
                  <p className="card-text flex-grow-1 small">{r.description}</p>
                  <NavLink
                    to={r.route}
                    className={`btn btn-${frameworkColour[r.framework] || "secondary"} btn-sm`}
                  >
                    Open
                  </NavLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Protected routes — generated from the registry ──────────────────────────
function ProtectedRoutes() {
  const { user } = useAuth();
  const remotes = getActiveRemotes();

  if (!user) return <Login />;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        {remotes.map((remote) => {
          let element;

          if (remote.type === "webpack-mf") {
            const Comp = webpackMfComponents[remote.key];
            element = Comp ? (
              <MfeLoader name={remote.displayName}>
                <Comp />
              </MfeLoader>
            ) : (
              <div className="alert alert-warning m-4">
                No component mapped for webpack-mf remote <code>{remote.key}</code>.
              </div>
            );
          } else if (remote.type === "native-federation") {
            element = <NativeFederationMfe config={remote} />;
          }

          return <Route key={remote.key} path={remote.route} element={element} />;
        })}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

