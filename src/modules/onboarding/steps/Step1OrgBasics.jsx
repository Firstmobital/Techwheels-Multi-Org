import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase";
import { saveOrgBasics } from "../../../lib/db/onboarding";

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;

export default function Step1OrgBasics({ orgId, setOrgId, registerSubmit, setStepValid }) {
  const [values, setValues] = useState({
    name: "",
    gstNumber: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    slug: "",
  });

  const valid = useMemo(() => {
    return (
      values.name.trim() &&
      GST_REGEX.test(values.gstNumber.trim().toUpperCase()) &&
      values.contactName.trim() &&
      PHONE_REGEX.test(values.contactPhone.trim()) &&
      /.+@.+\..+/.test(values.contactEmail.trim()) &&
      values.address.trim()
    );
  }, [values]);

  useEffect(() => {
    setStepValid(1, Boolean(valid));
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!valid) return { ok: false };

      const payload = {
        ...values,
        gstNumber: values.gstNumber.trim().toUpperCase(),
      };

      const row = await saveOrgBasics({ orgId, values: payload });
      setOrgId(row.id);

      const client = getSupabaseClient();
      await client.from("org_config").upsert(
        {
          org_id: row.id,
          key: "org_address",
          value: values.address,
        },
        { onConflict: "org_id,key" }
      );

      return { ok: true };
    });
  }, [orgId, registerSubmit, setOrgId, valid, values]);

  return (
    <div className="tw-step-grid">
      <h3>Step 1: Org basics</h3>
      <label>Dealership name</label>
      <input value={values.name} onChange={(event) => setValues((p) => ({ ...p, name: event.target.value }))} />

      <label>GST number</label>
      <input
        value={values.gstNumber}
        onChange={(event) => setValues((p) => ({ ...p, gstNumber: event.target.value.toUpperCase() }))}
        placeholder="27AABCU9603R1ZM"
      />

      <label>Primary contact name</label>
      <input
        value={values.contactName}
        onChange={(event) => setValues((p) => ({ ...p, contactName: event.target.value }))}
      />

      <label>Primary contact phone</label>
      <input
        value={values.contactPhone}
        onChange={(event) => setValues((p) => ({ ...p, contactPhone: event.target.value }))}
      />

      <label>Primary contact email</label>
      <input
        type="email"
        value={values.contactEmail}
        onChange={(event) => setValues((p) => ({ ...p, contactEmail: event.target.value }))}
      />

      <label>Address</label>
      <textarea
        rows={3}
        value={values.address}
        onChange={(event) => setValues((p) => ({ ...p, address: event.target.value }))}
      />

      {!valid && <p className="tw-inline-error">Complete all required fields with valid GST, phone, and email.</p>}
    </div>
  );
}
