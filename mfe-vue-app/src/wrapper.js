import { createApp } from "vue";
import App from "./App.vue";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useRef } from "react";

// Vue MFE receives stats via the window event bus (mfe:stats-update).
// The Vue app subscribes internally — no props or provide/inject needed here.
function VueWrapper() {
  const containerRef = useRef(null);
  const appInstanceRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !appInstanceRef.current) {
      appInstanceRef.current = createApp(App);
      appInstanceRef.current.mount(containerRef.current);
    }
    return () => {
      if (appInstanceRef.current) {
        appInstanceRef.current.unmount();
        appInstanceRef.current = null;
      }
    };
  }, []);

  return React.createElement("div", { ref: containerRef });
}

export default VueWrapper;
