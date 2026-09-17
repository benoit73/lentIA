import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { CarouselShell } from "./pages/CarouselShell";
import { SensorDetail } from "./pages/SensorDetail";

export default function App() {
  return (
    <RequireAuth>
      <Routes>
        <Route path="/" element={<CarouselShell />} />
        <Route path="/controle" element={<CarouselShell />} />
        <Route path="/journal" element={<CarouselShell />} />
        <Route path="/automatisation" element={<CarouselShell />} />
        <Route path="/sensors/:sensor" element={<SensorDetail />} />
      </Routes>
    </RequireAuth>
  );
}
