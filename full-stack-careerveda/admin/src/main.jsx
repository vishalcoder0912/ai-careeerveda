import React from "react";
import {createRoot} from "react-dom/client";

import App from "./App";
import "./styles/admin.css";
import "./styles/admin-ux.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
