import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Play } from "@/pages/Play";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/:level" element={<Play />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
