import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  return (
    <div className="container mt-4">
      <div className="alert alert-primary">
        <h4>React MFE Loaded Successfully!</h4>
        <p className="mb-0">
          This is a <strong>React 19</strong> Micro Frontend running on port <code>3001</code>,
          loaded inside the Shell via <strong>Webpack 5 Module Federation</strong>.
        </p>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">React MFE Details</h5>
          <ul>
            <li>Framework: React 19</li>
            <li>Bundler: Webpack 5</li>
            <li>Shared: react, react-dom (singleton with Shell)</li>
            <li>CSS: Bootstrap 5 (shared)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
