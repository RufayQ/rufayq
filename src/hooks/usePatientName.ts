import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface PatientNameState {
  patientName: string;
  patientNameAr: string;
  loading: boolean;
}

/** Resolve a friendly first name: auth metadata → profiles by device_id → empty. */
export function usePatientName(): PatientNameState {
  const [state, setState] = useState<PatientNameState>({
    patientName: "",
    patientNameAr: "",
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const meta = (session?.user?.user_metadata || {}) as Record<string, string>;
      let en = (meta.full_name || meta.name || "").trim();
      let ar = "";
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
      if (cancelled) return;
      setState({
        patientName: en ? en.split(" ")[0] : "",
        patientNameAr: ar ? ar.split(" ")[0] : "",
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return state;

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
