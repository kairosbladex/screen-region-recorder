import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SelectionOverlay } from "./components/SelectionOverlay";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{mode === "selection" ? <SelectionOverlay /> : <App />}</React.StrictMode>
);
