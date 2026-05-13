import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export function usePatientName() {
  const [patientName, setPatientName] = useState("");
  const [patientNameAr, setPatientNameAr] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPatientName = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const meta = (session?.user?.user_metadata || {}) as Record<string, string>;
      let en = (meta.full_name || meta.name || "").trim();
      let ar = "";

      if (!en) {
        const did = getDeviceId();
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name_en, full_name_ar")
          .eq("device_id", did)
          .maybeSingle();

        en = (prof?.full_name_en || "").trim();
        ar = (prof?.full_name_ar || "").trim();
      }

      if (!cancelled) {
        setPatientName(en ? en.split(" ")[0] : "");
        setPatientNameAr(ar ? ar.split(" ")[0] : "");
      }
    };

    void loadPatientName();

    return () => {
      cancelled = true;
    };
  }, []);

  return { patientName, patientNameAr };
}
