import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import Dashboard from "./pages/Dashboard";

import Settings from "./pages/Dashboard";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<><Dashboard /></>} />
        <Route path="/dashboard" element={<PrivateRoute><Settings /></PrivateRoute>} />
      </Routes>
    </AuthProvider>
  );
}