import { createApp } from "vue";
import App from "./App.vue";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useRef } from "react";

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
