import { useOrg } from "../context/OrgContext";

export default function ModuleGuard({ module, children }) {
  const { loading, hasModule } = useOrg();

  if (loading) return null;
  if (!hasModule(module)) return null;

  return children;
}
