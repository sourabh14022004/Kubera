import { Routes, Route, Navigate } from "react-router";

import RequiredAuth from "./auth/RequiredAuth";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ToastProvider } from "./context/ToastContext";
import ActivityPage from "./pages/ActivityPage";
import AssetsAndLoansPage from "./pages/AssetsAndLoansPage";
import CategoriesPage from "./pages/CategoriesPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import InventoryPage from "./pages/InventoryPage";
import LoginPage from "./pages/LoginPage";
import MembersPage from "./pages/MembersPage";
import SettingsPage from "./pages/SettingsPage";
import StoragePage from "./pages/StoragePage";

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequiredAuth />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/loans" element={<AssetsAndLoansPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
