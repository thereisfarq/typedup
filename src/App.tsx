import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Play } from "@/pages/Play";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <BrowserRouter basename={routerBasename || undefined}>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/:level" element={<Play />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
