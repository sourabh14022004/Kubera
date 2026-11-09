
import { Routes, Route, Navigate } from "react-router";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import InventoryPage from "./pages/InventoryPage";

import DashboardLayout from "./components/layout/DashboardLayout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="/inventory"
          element={
            <InventoryPage/>
          }
        />

        <Route
          path="/members"
          element={
            <PlaceholderPage
              title="Member Management"
              description="Manage club members and their permissions."
            />
          }
        />

        <Route
          path="/storage"
          element={
            <PlaceholderPage
              title="Storage Locations"
              description="Explore racks, cabinets and drawer locations."
            />
          }
        />

        <Route
          path="/activity"
          element={
            <PlaceholderPage
              title="Activity Log"
              description="Track inventory checkouts, returns and changes."
            />
          }
        />

        <Route
          path="/settings"
          element={
            <PlaceholderPage
              title="Settings"
              description="Manage application settings and preferences."
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
