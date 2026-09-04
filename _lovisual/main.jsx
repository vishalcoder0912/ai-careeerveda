import React from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter} from "react-router-dom";
import SiteNavbar from "../src/components/SiteNavbar";
import {navItems} from "../src/data/siteData";
import "../src/styles.css";

const App = () => (
  <MemoryRouter initialEntries={["/"]}>
    <div style={{minHeight: "200vh", background: "#0b1220"}}>
      <SiteNavbar navItems={navItems} />
    </div>
  </MemoryRouter>
);

createRoot(document.getElementById("root")).render(<App />);