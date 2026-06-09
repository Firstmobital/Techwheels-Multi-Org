export function buildQuotePdfPayload({ quote, org, theme, template, lineItems }) {
  return {
    org: {
      name: org?.name || "TechWheels",
      logoUrl: theme?.logo_url || null,
      primaryColor: theme?.primary_color || "#2563EB",
    },
    template: {
      show_ndp: Boolean(template?.show_ndp),
      show_esp: template?.show_esp !== false,
      show_rto: template?.show_rto !== false,
      show_insurance: template?.show_insurance !== false,
      show_accessories: template?.show_accessories !== false,
      show_schemes: template?.show_schemes !== false,
      field_labels: template?.field_labels || {},
      footer_text: template?.footer_text || "",
      terms_text: template?.terms_text || "",
    },
    quote,
    lineItems,
  };
}
