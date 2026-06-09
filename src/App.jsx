import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./guards/ProtectedRoute";
import ModuleGuard from "./guards/ModuleGuard";
import AccessStudio from "./modules/hierarchy/AccessStudio";
import ApprovalsInbox from "./modules/hierarchy/ApprovalsInbox";
import EmployeeList from "./modules/hierarchy/EmployeeList";
import OrgChart from "./modules/hierarchy/OrgChart";
import RolesManagement from "./modules/hierarchy/RolesManagement";
import QuoteBuilder from "./modules/quotes/QuoteBuilder";
import QuoteDetail from "./modules/quotes/QuoteDetail";
import QuoteList from "./modules/quotes/QuoteList";
import QuotePdfTemplateEditor from "./modules/quotes/QuotePdfTemplateEditor";
import SchemesManagement from "./modules/quotes/SchemesManagement";
import WhatsappTemplateEditor from "./modules/quotes/WhatsappTemplateEditor";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import OnboardingWizard from "./pages/OnboardingWizard";
import OrgSettings from "./pages/OrgSettings";

function RootRedirect() {
  const { user, isLoading, loading } = useAuth();
  const busy = typeof isLoading === "boolean" ? isLoading : loading;

  if (busy) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function CoreCrmRoute({ children }) {
  return (
    <ModuleGuard module="core_crm">
      {children}
    </ModuleGuard>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/quotes"
          element={
            <CoreCrmRoute>
              <QuoteList />
            </CoreCrmRoute>
          }
        />
        <Route
          path="/quotes/new"
          element={
            <CoreCrmRoute>
              <QuoteBuilder />
            </CoreCrmRoute>
          }
        />
        <Route
          path="/quotes/:id"
          element={
            <CoreCrmRoute>
              <QuoteDetail />
            </CoreCrmRoute>
          }
        />
        <Route
          path="/quotes/admin/pdf-template"
          element={
            <CoreCrmRoute>
              <QuotePdfTemplateEditor />
            </CoreCrmRoute>
          }
        />
        <Route
          path="/quotes/admin/whatsapp"
          element={
            <CoreCrmRoute>
              <WhatsappTemplateEditor />
            </CoreCrmRoute>
          }
        />
        <Route
          path="/quotes/admin/schemes"
          element={
            <CoreCrmRoute>
              <SchemesManagement />
            </CoreCrmRoute>
          }
        />
        <Route path="/org/chart" element={<OrgChart />} />
        <Route path="/org/employees" element={<EmployeeList />} />
        <Route path="/org/access" element={<AccessStudio />} />
        <Route path="/org/roles" element={<RolesManagement />} />
        <Route path="/org/approvals" element={<ApprovalsInbox />} />
        <Route path="/settings" element={<OrgSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
