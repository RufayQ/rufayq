import { useDomainData } from "./useDomainData";
import { appointmentApi, type AppointmentRow } from "@/lib/api/appointmentApi";
export const useAppointments = () => useDomainData<AppointmentRow>(appointmentApi);
