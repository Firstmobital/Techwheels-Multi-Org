import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployeeDetails } from "../lib/db/employees";
import { supabase } from "../lib/supabase";
import useAuthStore from "../stores/authStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, setEmployee: setEmployeeStore, clearAuth } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function resolveEmployee(userId) {
      if (!userId) {
        setEmployee(null);
        setEmployeeStore(null);
        return;
      }

      try {
        const employeeRecord = await getEmployeeDetails(userId);
        if (!mounted) return;
        setEmployee(employeeRecord);
        setEmployeeStore(employeeRecord);
      } catch (_error) {
        if (!mounted) return;
        setEmployee(null);
        setEmployeeStore(null);
      }
    }

    async function hydrateFromSession(nextSession) {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      await resolveEmployee(nextSession?.user?.id);
      if (mounted) setIsLoading(false);
    }

    if (!supabase) {
      setIsLoading(false);
      return () => {};
    }

    supabase.auth.getSession().then(({ data }) => hydrateFromSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession?.user) {
        clearAuth();
        setEmployee(null);
        setSession(null);
        setIsLoading(false);
        return;
      }

      await hydrateFromSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuth, setEmployeeStore, setUser]);

  async function signOut() {
    if (!supabase) {
      clearAuth();
      navigate("/login", { replace: true });
      return;
    }

    await supabase.auth.signOut();
    clearAuth();
    setSession(null);
    setEmployee(null);
    navigate("/login", { replace: true });
  }

  const value = useMemo(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      employee,
      isLoading,
      loading: isLoading,
      signOut,
    }),
    [session, employee, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
