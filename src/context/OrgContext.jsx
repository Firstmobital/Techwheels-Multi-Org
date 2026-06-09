import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";
import { getOrg, getOrgLocations, getOrgTheme } from "../lib/db/orgs";
import { getOrgModules, hasModule as hasModuleUtil } from "../lib/db/modules";
import { useAuth } from "./AuthContext";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [orgTheme, setOrgTheme] = useState(null);
  const [orgConfig, setOrgConfig] = useState([]);
  const [orgModules, setOrgModules] = useState([]);
  const [orgLocations, setOrgLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refreshOrgContext(activeGuard = { current: true }) {
    if (!user?.id) {
      if (activeGuard.current) {
        setOrg(null);
        setOrgTheme(null);
        setOrgConfig([]);
        setOrgModules([]);
        setOrgLocations([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();

      const [orgRow, theme, configRows, modules, locations] = await Promise.all([
        getOrg(),
        getOrgTheme(),
        client.from("org_config").select("key, value"),
        getOrgModules(),
        getOrgLocations(),
      ]);

      if (!activeGuard.current) return;

      if (configRows.error) throw configRows.error;

      setOrg(orgRow ?? null);
      setOrgTheme(theme ?? null);
      setOrgConfig(configRows.data ?? []);
      setOrgModules(modules ?? []);
      setOrgLocations(locations ?? []);
    } catch (loadError) {
      if (!activeGuard.current) return;
      setError(loadError);
    } finally {
      if (activeGuard.current) setLoading(false);
    }
  }

  useEffect(() => {
    const active = { current: true };

    refreshOrgContext(active);

    return () => {
      active.current = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const brand = orgTheme?.primary_color || "#2563EB";
    document.documentElement.style.setProperty("--brand", brand);
  }, [orgTheme?.primary_color]);

  const configMap = useMemo(() => {
    return new Map((orgConfig ?? []).map((item) => [item.key, item.value]));
  }, [orgConfig]);

  const value = useMemo(
    () => ({
      org,
      orgTheme,
      orgConfig,
      orgModules,
      orgLocations,
      loading,
      error,
      hasModule: (moduleKey) => hasModuleUtil(orgModules, moduleKey),
      getConfig: (key) => configMap.get(key),
      refreshOrgContext: () => refreshOrgContext({ current: true }),
    }),
    [configMap, error, loading, org, orgConfig, orgLocations, orgModules, orgTheme]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return context;
}
