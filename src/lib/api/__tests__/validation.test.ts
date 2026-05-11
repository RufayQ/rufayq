import { describe, it, expect } from 'vitest';
import { ValidationError } from '@/lib/api/schemas';
import { appointmentApi } from '@/lib/api/appointmentApi';
import { allergyApi } from '@/lib/api/allergyApi';
import { medicalRecordApi } from '@/lib/api/medicalRecordApi';
import { journeyApi } from '@/lib/api/journeyApi';
import { carePlanApi } from '@/lib/api/carePlanApi';
import { educationApi } from '@/lib/api/educationApi';
import { medicationApi } from '@/lib/api/medicationApi';

describe('Zod validation integration', () => {
  it('appointment validation fails when title missing', async () => {
    await expect(async () => appointmentApi.save({} as any)).rejects.toThrow(ValidationError);
  });

  it('allergy validation fails when allergen missing', async () => {
    await expect(async () => allergyApi.save({} as any)).rejects.toThrow(ValidationError);
  });

  it('medical record validation fails when required fields missing', async () => {
    await expect(async () => medicalRecordApi.save({} as any)).rejects.toThrow(ValidationError);
  });

  it('journey validation fails when title missing', async () => {
    await expect(async () => journeyApi.save({} as any)).rejects.toThrow(ValidationError);
  });

  it('care plan validation fails when title missing', async () => {
    await expect(async () => carePlanApi.save({} as any)).rejects.toThrow(ValidationError);
  });

  it('education validation fails when content_id/title missing', async () => {
    await expect(async () => educationApi.save({} as any)).rejects.toThrow(ValidationError);
  });

  it('medication validation fails when medication_name missing', async () => {
    await expect(async () => medicationApi.save({} as any)).rejects.toThrow(ValidationError);
  });
});
