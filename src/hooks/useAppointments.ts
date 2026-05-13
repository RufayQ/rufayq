import { useDomainData } from "./useDomainData";
import { appointmentApi, type AppointmentRow } from "@/lib/api/appointmentApi";
import { useGuestMode } from "@/hooks/useGuestMode";

export const useAppointments = () => {
  const isGuest = useGuestMode();
  return useDomainData<AppointmentRow>(appointmentApi, !isGuest);
};
