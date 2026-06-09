import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, isLoading, loading } = useAuth();
  const busy = typeof isLoading === "boolean" ? isLoading : loading;

  if (busy) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
