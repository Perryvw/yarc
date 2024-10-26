import { createRoot } from "react-dom/client";
import App from "./App";

const domContainer = document.querySelector("#app");
const root = createRoot(domContainer!);
root.render(App());
