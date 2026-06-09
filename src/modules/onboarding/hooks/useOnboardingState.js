import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useOrg } from "../../../context/OrgContext";
import {
  fetchOrgForOnboarding,
  getOrgIdFromSession,
  onboardingSteps,
  updateOrgStep,
} from "../../../lib/db/onboarding";
import { toast } from "../../../stores/toastStore";

export function useOnboardingState() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { org, refreshOrgContext } = useOrg();
  const [currentStep, setCurrentStep] = useState(1);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validityMap, setValidityMap] = useState({});

  const hydratedOrgId = org?.id || getOrgIdFromSession(session);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      setLoading(true);

      try {
        const targetOrgId = hydratedOrgId || null;
        const row = await fetchOrgForOnboarding(targetOrgId);
        if (!active) return;

        setOrgId(row?.id || targetOrgId);
        setCurrentStep(row?.onboarding_step || 1);
      } catch (_error) {
        if (!active) return;
        setOrgId(hydratedOrgId || null);
        setCurrentStep(1);
      } finally {
        if (active) setLoading(false);
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [hydratedOrgId]);

  const stepMeta = useMemo(
    () => onboardingSteps.find((step) => step.id === currentStep) || onboardingSteps[0],
    [currentStep]
  );

  const canProceed = Boolean(validityMap[currentStep]);

  const setStepValid = useCallback((stepNumber, valid) => {
    setValidityMap((prev) => ({ ...prev, [stepNumber]: valid }));
  }, []);

  const persistStep = useCallback(
    async (stepNumber, complete = false) => {
      if (!orgId) return;
      await updateOrgStep(orgId, stepNumber, complete);
      await refreshOrgContext();
    },
    [orgId, refreshOrgContext]
  );

  const goToStep = useCallback((stepNumber) => {
    const bounded = Math.max(1, Math.min(10, stepNumber));
    setCurrentStep(bounded);
  }, []);

  const goNext = useCallback(async () => {
    const next = Math.min(10, currentStep + 1);
    await persistStep(next, false);
    setCurrentStep(next);
  }, [currentStep, persistStep]);

  const skipStep = useCallback(async () => {
    const next = Math.min(10, currentStep + 1);
    await persistStep(next, false);
    setCurrentStep(next);
  }, [currentStep, persistStep]);

  const saveAndExit = useCallback(async () => {
    await persistStep(currentStep, false);
    toast.info("Progress saved.");
    navigate("/dashboard", { replace: true });
  }, [currentStep, navigate, persistStep]);

  const completeWizard = useCallback(async () => {
    await persistStep(10, true);
    navigate("/dashboard", { replace: true });
  }, [navigate, persistStep]);

  return {
    loading,
    orgId,
    setOrgId,
    currentStep,
    stepMeta,
    canProceed,
    setStepValid,
    goToStep,
    goNext,
    skipStep,
    saveAndExit,
    completeWizard,
  };
}
