import { useMemo, useState } from "react";
import { onboardingSteps } from "../../lib/db/onboarding";
import { toast } from "../../stores/toastStore";
import { useOnboardingState } from "./hooks/useOnboardingState";
import Step10Modules from "./steps/Step10Modules";
import Step1OrgBasics from "./steps/Step1OrgBasics";
import Step2Branding from "./steps/Step2Branding";
import Step3RoleTemplate from "./steps/Step3RoleTemplate";
import Step4CustomiseRoles from "./steps/Step4CustomiseRoles";
import Step5Locations from "./steps/Step5Locations";
import Step6InviteEmployees from "./steps/Step6InviteEmployees";
import Step7VehicleCatalogue from "./steps/Step7VehicleCatalogue";
import Step8ConfigurePricing from "./steps/Step8ConfigurePricing";
import Step9DocumentChecklist from "./steps/Step9DocumentChecklist";

const STEP_COMPONENTS = {
  1: Step1OrgBasics,
  2: Step2Branding,
  3: Step3RoleTemplate,
  4: Step4CustomiseRoles,
  5: Step5Locations,
  6: Step6InviteEmployees,
  7: Step7VehicleCatalogue,
  8: Step8ConfigurePricing,
  9: Step9DocumentChecklist,
  10: Step10Modules,
};

export default function OnboardingWizard() {
  const {
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
  } = useOnboardingState();
  const [submitFn, setSubmitFn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const ActiveStep = STEP_COMPONENTS[currentStep];

  const completedStepSet = useMemo(() => {
    const items = new Set();
    for (let i = 1; i < currentStep; i += 1) items.add(i);
    return items;
  }, [currentStep]);

  if (loading) {
    return <div className="tw-onboarding-page">Loading onboarding...</div>;
  }

  async function handleNext() {
    if (!submitFn) return;

    setSubmitting(true);

    try {
      const result = await submitFn();
      if (!result?.ok) return;

      if (currentStep === 10) {
        await completeWizard();
        toast.success("Onboarding completed.");
        return;
      }

      await goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save step.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    try {
      await skipStep();
    } catch (_error) {
      toast.error("Unable to skip step right now.");
    }
  }

  return (
    <div className="tw-onboarding-wrap">
      <div className="tw-onboarding-top">
        <div>
          <h2>Organisation setup</h2>
          <p>Complete these 10 steps to configure your dealership workspace.</p>
        </div>
        <button type="button" className="tw-link-btn" onClick={saveAndExit}>
          Save & exit
        </button>
      </div>

      <div className="tw-onboarding-steps" role="tablist" aria-label="Onboarding steps">
        {onboardingSteps.map((step) => (
          <button
            type="button"
            key={step.id}
            className={`tw-step-chip${currentStep === step.id ? " active" : ""}${completedStepSet.has(step.id) ? " done" : ""}`}
            onClick={() => goToStep(step.id)}
          >
            <span>{completedStepSet.has(step.id) ? "✓" : step.id}</span>
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      <div className="tw-onboarding-card">
        <ActiveStep
          orgId={orgId}
          setOrgId={setOrgId}
          registerSubmit={setSubmitFn}
          setStepValid={setStepValid}
          goToStep={goToStep}
        />

        <div className="tw-onboarding-actions">
          {stepMeta.skippable && currentStep !== 10 ? (
            <button type="button" className="tw-link-btn" onClick={handleSkip}>
              Skip for now
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting || (!stepMeta.skippable && !canProceed)}
          >
            {submitting ? "Saving..." : currentStep === 10 ? "Finish onboarding" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
