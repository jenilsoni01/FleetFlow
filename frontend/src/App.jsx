import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Maintenance from "./pages/Maintenance";
import Expenses from "./pages/Expenses";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trips"
                element={
                  <ProtectedRoute>
                    <Trips />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trips/:id"
                element={
                  <ProtectedRoute>
                    <TripDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute>
                    <Vehicles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drivers"
                element={
                  <ProtectedRoute>
                    <Drivers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute>
                    <Maintenance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
