import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthPending from "./AuthPending";

export default function GuestRoute() {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <AuthPending />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
