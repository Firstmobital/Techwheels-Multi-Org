import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useOrg } from "../../context/OrgContext";
import {
  callGenerateQuotePdf,
  getInsuranceRatesForVariant,
  getOrgQuoteTemplate,
  getQuoteBuilderBootstrap,
  getRtoChargeForVariant,
  getWhatsappTemplate,
  replaceQuoteLineItems,
  saveQuote,
  updateQuoteWhatsappSent,
} from "./lib/quoteApi";
import {
  calculateAccessories,
  calculateEsp,
  calculateInsurance,
  calculateRto,
  calculateSchemes,
  calculateTcs,
  calculateTotal,
} from "./lib/quoteCalculations";
import { buildQuotePdfPayload } from "./lib/pdfTemplate";
import PricingSidebar from "./components/PricingSidebar";
import Step1CustomerVehicle from "./steps/Step1CustomerVehicle";
import Step2RTO from "./steps/Step2RTO";
import Step3Insurance from "./steps/Step3Insurance";
import Step4Accessories from "./steps/Step4Accessories";
import Step5Schemes from "./steps/Step5Schemes";
import Step6Summary from "./steps/Step6Summary";
import useQuoteStore from "./stores/quoteStore";
import { toast } from "../../stores/toastStore";

const STEPS = [
  "Customer & Vehicle",
  "RTO",
  "Insurance",
  "Accessories",
  "Schemes",
  "Summary",
];

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { org, orgTheme } = useOrg();
  const quoteStore = useQuoteStore();
  const snapshot = useQuoteStore((state) => state.getSnapshot());

  const [currentStep, setCurrentStep] = useState(0);
  const [bootstrap, setBootstrap] = useState({
    variants: [],
    rtoTypes: [],
    accessories: [],
    schemes: [],
    insuranceCompanies: [],
    insuranceAddons: [],
    validityDays: 30,
    tcsThreshold: 1000000,
  });
  const [insuranceRates, setInsuranceRates] = useState([]);
  const [pdfTemplate, setPdfTemplate] = useState(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [builderData, pdfTpl, waTpl] = await Promise.all([
          getQuoteBuilderBootstrap(),
          getOrgQuoteTemplate(),
          getWhatsappTemplate(),
        ]);

        if (!active) return;

        setBootstrap(builderData);
        setPdfTemplate(pdfTpl || null);
        setWhatsappTemplate(waTpl || null);

        quoteStore.setMeta({
          validity_days: builderData.validityDays,
          valid_until: new Date(Date.now() + builderData.validityDays * 24 * 60 * 60 * 1000).toISOString(),
          location_id: employee?.location_ids?.[0] || "",
        });
      } catch (_error) {
        toast.error("Failed to load quote builder configuration.");
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [employee?.location_ids]);

  useEffect(() => {
    if (!snapshot.vehicle.variant_id) {
      setInsuranceRates([]);
      return;
    }

    getInsuranceRatesForVariant(snapshot.vehicle.variant_id)
      .then(setInsuranceRates)
      .catch(() => setInsuranceRates([]));
  }, [snapshot.vehicle.variant_id]);

  const totals = useMemo(() => {
    const esp = calculateEsp(snapshot.vehicle);
    const rto = calculateRto(snapshot.rto.amount);
    const insuranceTotal = snapshot.insurance.totals?.total || 0;
    const accessoriesTotal = calculateAccessories(snapshot.accessories.rows);
    const schemesTotal = calculateSchemes(snapshot.schemes.rows);
    const subtotal = esp + rto + insuranceTotal + accessoriesTotal - schemesTotal;
    const tcs = calculateTcs(subtotal, bootstrap.tcsThreshold);
    const total = calculateTotal(esp, rto, insuranceTotal, accessoriesTotal, schemesTotal, tcs);

    quoteStore.setTotals({ tcs, total });

    return { esp, rto, insuranceTotal, accessoriesTotal, schemesTotal, tcs, total };
  }, [
    bootstrap.tcsThreshold,
    snapshot.accessories.rows,
    snapshot.insurance.totals?.total,
    snapshot.rto.amount,
    snapshot.schemes.rows,
    snapshot.vehicle,
  ]);

  const lineItems = useMemo(() => {
    const items = [
      { line_type: "esp", label: "Ex-showroom price (ESP)", amount: totals.esp },
      { line_type: "rto", label: `RTO - ${snapshot.rto.rto_name || "Not selected"}`, amount: totals.rto },
      { line_type: "insurance", label: `Insurance - ${snapshot.insurance.company_name || "Not selected"}`, amount: totals.insuranceTotal },
      { line_type: "accessory", label: "Accessories", amount: totals.accessoriesTotal },
      ...snapshot.schemes.rows.map((scheme) => ({
        line_type: "scheme",
        label: scheme.name,
        amount: Number(scheme.amount || 0),
        is_deduction: true,
      })),
    ];

    if (totals.tcs > 0) {
      items.push({ line_type: "tcs", label: "TCS", amount: totals.tcs });
    }

    return items;
  }, [snapshot.insurance.company_name, snapshot.rto.rto_name, snapshot.schemes.rows, totals]);

  const pdfPreview = useMemo(() => {
    const payload = buildQuotePdfPayload({
      quote: {
        customerName: snapshot.customer.name,
        vehicle: snapshot.vehicle.variant_name,
        colour: snapshot.vehicle.colour,
        total: totals.total,
        validity: snapshot.meta.valid_until,
      },
      org,
      theme: orgTheme,
      template: pdfTemplate,
      lineItems,
    });

    return `
      <div style="font-family: Arial, sans-serif;">
        <div style="background:${payload.org.primaryColor};color:#fff;padding:10px;border-radius:8px;">
          <strong>${payload.org.name}</strong>
        </div>
        <p><strong>Customer:</strong> ${payload.quote.customerName || "-"}</p>
        <p><strong>Vehicle:</strong> ${payload.quote.vehicle || "-"} ${payload.quote.colour || ""}</p>
        <hr/>
        ${payload.lineItems
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;"><span>${item.label}</span><span>${item.is_deduction ? "-" : ""}INR ${Number(item.amount || 0).toLocaleString("en-IN")}</span></div>`
          )
          .join("")}
        <hr/>
        <div style="display:flex;justify-content:space-between;font-weight:bold;"><span>Total</span><span>INR ${Number(
          payload.quote.total || 0
        ).toLocaleString("en-IN")}</span></div>
      </div>
    `;
  }, [lineItems, org, orgTheme, pdfTemplate, snapshot.customer.name, snapshot.meta.valid_until, snapshot.vehicle.colour, snapshot.vehicle.variant_name, totals.total]);

  async function persistQuote(status, pdfUrl = null) {
    const quotePayload = quoteStore.getSnapshot();
    const quoteRow = await saveQuote({
      orgId: org?.id,
      employeeId: employee?.id,
      payload: quotePayload,
      quoteId: quotePayload.meta.quote_id,
      status,
      pdfUrl,
    });

    await replaceQuoteLineItems({
      orgId: org?.id,
      quoteId: quoteRow.id,
      lineItems,
    });

    quoteStore.setMeta({ quote_id: quoteRow.id });
    return quoteRow;
  }

  async function onSaveDraft() {
    await persistQuote("draft");
    toast.success("Draft saved.");
  }

  async function onGeneratePdf() {
    const quote = await persistQuote("sent");

    const response = await callGenerateQuotePdf({
      quoteId: quote.id,
      orgId: org?.id,
      orgName: org?.name,
      logoUrl: orgTheme?.logo_url,
      lineItems,
      total: totals.total,
      customerName: snapshot.customer.name,
      variantName: snapshot.vehicle.variant_name,
    });

    if (response?.url) {
      await saveQuote({
        orgId: org?.id,
        employeeId: employee?.id,
        payload: quoteStore.getSnapshot(),
        quoteId: quote.id,
        status: "sent",
        pdfUrl: response.url,
      });
      window.open(response.url, "_blank", "noopener,noreferrer");
    }

    toast.success("PDF generated.");
  }

  async function onSendWhatsapp() {
    const quote = await persistQuote("sent");

    const templateBody =
      whatsappTemplate?.template_body ||
      "Hi {customer_name}, here is your quote for {car_model} {variant}. Total on-road price: INR {total_price}. Valid until {validity_date}. - {salesperson_name}, {org_name}";

    const [make, model] = (snapshot.vehicle.variant_name || "").split(" ");

    const message = templateBody
      .replaceAll("{customer_name}", snapshot.customer.name)
      .replaceAll("{car_model}", model || make || "Vehicle")
      .replaceAll("{variant}", snapshot.vehicle.variant_name || "")
      .replaceAll("{colour}", snapshot.vehicle.colour || "")
      .replaceAll("{total_price}", Number(snapshot.totals.total || 0).toLocaleString("en-IN"))
      .replaceAll("{validity_date}", new Date(snapshot.meta.valid_until || Date.now()).toLocaleDateString())
      .replaceAll("{salesperson_name}", employee?.full_name || "Sales Executive")
      .replaceAll("{org_name}", org?.name || "TechWheels");

    window.open(`https://wa.me/91${snapshot.customer.phone}?text=${encodeURIComponent(message)}`, "_blank");

    await updateQuoteWhatsappSent(quote.id);
    toast.success("WhatsApp prefill opened.");
  }

  const canProceed =
    currentStep === 0
      ? Boolean(snapshot.customer.name && snapshot.customer.phone && snapshot.vehicle.variant_id)
      : currentStep === 1
      ? Boolean(snapshot.rto.rto_type_id)
      : currentStep === 2
      ? Boolean(snapshot.insurance.insurance_company_id)
      : true;

  const StepComponent =
    currentStep === 0
      ? Step1CustomerVehicle
      : currentStep === 1
      ? Step2RTO
      : currentStep === 2
      ? Step3Insurance
      : currentStep === 3
      ? Step4Accessories
      : currentStep === 4
      ? Step5Schemes
      : Step6Summary;

  return (
    <div className="tw-quote-builder-layout">
      <div className="tw-quote-main">
        <div className="tw-quote-steps">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`tw-step-chip${currentStep === index ? " active" : ""}${currentStep > index ? " done" : ""}`}
              onClick={() => setCurrentStep(index)}
            >
              <span>{currentStep > index ? "✓" : index + 1}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="tw-panel">
          <StepComponent
            bootstrap={bootstrap}
            snapshot={snapshot}
            insuranceRates={insuranceRates}
            lineItems={lineItems}
            pdfPreview={pdfPreview}
            setCustomer={quoteStore.setCustomer}
            setVehicle={quoteStore.setVehicle}
            setRto={quoteStore.setRto}
            setInsurance={quoteStore.setInsurance}
            setAccessories={quoteStore.setAccessories}
            setSchemes={quoteStore.setSchemes}
            calculateInsuranceTotals={calculateInsurance}
            calculateAccessoriesTotal={calculateAccessories}
            calculateSchemesTotal={calculateSchemes}
            getRtoCharge={getRtoChargeForVariant}
            onSaveDraft={onSaveDraft}
            onGeneratePdf={onGeneratePdf}
            onSendWhatsapp={onSendWhatsapp}
          />
        </div>

        <div className="tw-action-row">
          <button type="button" disabled={currentStep === 0} onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}>
            Back
          </button>
          <button
            type="button"
            disabled={currentStep >= STEPS.length - 1 || !canProceed}
            onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next
          </button>
          <button type="button" onClick={() => navigate("/quotes")}>Exit</button>
        </div>
      </div>

      <PricingSidebar lineItems={lineItems} canGeneratePdf={currentStep === 5} onGeneratePdf={onGeneratePdf} />
    </div>
  );
}
