-- Rename 'passport' record type to 'legal_document' on medical_records
ALTER TABLE public.medical_records DROP CONSTRAINT IF EXISTS medical_records_record_type_check;

UPDATE public.medical_records SET record_type = 'legal_document' WHERE record_type = 'passport';

ALTER TABLE public.medical_records
  ADD CONSTRAINT medical_records_record_type_check
  CHECK (record_type IN ('lab','radiology','prescription','discharge_summary','medical_report','insurance','legal_document','other'));