/**
 * Hand-curated OpenAPI 3.1 spec describing the public RufayQ API surface
 * (the resources exported from `@/api`). Used by the Swagger UI page at
 * /admin/swagger. Kept in sync manually with the Zod contracts.
 */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "RufayQ API",
    version: "1.0.0",
    description:
      "Single contract surface used by the web app, the admin portal, and the mobile shells (iOS / Android / Huawei). Every operation is implemented in `src/api/clients/*.client.ts` and validated with Zod contracts in `src/api/contracts/*`.\n\nAll client methods return `{ data, error }` — they never throw. RLS is enforced server-side; the `authClient.canPerform` helper is for UI gating only.",
    contact: { name: "RufayQ engineering", url: "https://rufayq.com" },
  },
  servers: [
    { url: "https://dlzwgkdiqabapgnvufil.supabase.co", description: "Production (Supabase)" },
  ],
  tags: [
    { name: "Subscriptions", description: "Active plan, trial state, pending receipt." },
    { name: "Payments", description: "Bank-transfer receipts: upload, list, verify." },
    { name: "CMS", description: "Marketing pages and landing sections." },
    { name: "Tickets", description: "Customer-support tickets." },
    { name: "Reviews", description: "App reviews moderation." },
    { name: "RCM", description: "Revenue-cycle management claims for patients/providers." },
    { name: "Auth", description: "Current user, roles, and permission checks." },
    { name: "Patient · Journeys", description: "Treatment trips, timeline steps, and tickets owned by the patient." },
    { name: "Patient · Medications", description: "Medication schedule, doses, and adherence history." },
    { name: "Patient · Appointments", description: "Medical visits, reminders, and Smart Scan auto-generated entries." },
    { name: "Patient · Records", description: "Bilingual medical records vault (lab results, imaging, prescriptions)." },
    { name: "Patient · Scanner", description: "AI document extraction wizard (5-step OCR + structured output)." },
    { name: "Patient · Chat", description: "RufayQ AI chat with voice notes and medical record context." },
    { name: "Provider Portal · EMR", description: "Read-only EMR access for verified providers (insurance, hospitals) — patient consent required." },
    { name: "Provider Portal · Claims", description: "RCM claim lifecycle: eligibility → authorization → activation → submission → settlement." },
  ],
  components: {
    securitySchemes: {
      SupabaseJWT: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase auth JWT issued via the patient or admin sign-in flow.",
      },
      DeviceId: {
        type: "apiKey",
        in: "header",
        name: "x-device-id",
        description: "Anonymous device id for guest/trial flows.",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "string",
            enum: [
              "invalid_input",
              "query_failed",
              "insert_failed",
              "update_failed",
              "delete_failed",
              "contract_violation",
              "validation_failed",
            ],
          },
          message: { type: "string" },
        },
      },
      Subscription: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid", nullable: true },
          device_id: { type: "string", nullable: true },
          plan_code: { type: "string" },
          status: {
            type: "string",
            enum: ["trial", "active", "past_due", "cancelled", "expired"],
          },
          current_period_start: { type: "string", format: "date-time" },
          current_period_end: { type: "string", format: "date-time" },
          notes: { type: "string", nullable: true },
        },
      },
      PaymentReceipt: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          subscription_id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          currency: { type: "string", example: "SAR" },
          status: {
            type: "string",
            enum: ["pending", "verified", "rejected", "expired"],
          },
          receipt_url: { type: "string", format: "uri", nullable: true },
          reviewer_notes: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CmsPage: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          body_md: { type: "string" },
          body_md_ar: { type: "string" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      SupportTicket: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          subject: { type: "string" },
          body: { type: "string" },
          status: { type: "string", enum: ["open", "pending", "resolved", "closed"] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      AppReview: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          body: { type: "string" },
          author_name: { type: "string", nullable: true },
          approved: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      PatientClaim: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: [
              "eligibility",
              "authorization",
              "activation",
              "in_progress",
              "submitted",
              "paid",
              "rejected",
            ],
          },
          amount: { type: "number" },
          currency: { type: "string" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      Trip: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          destination_country: { type: "string" },
          destination_city: { type: "string" },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date", nullable: true },
          purpose: { type: "string" },
          status: { type: "string", enum: ["planned", "active", "completed", "cancelled"] },
        },
      },
      Medication: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          name: { type: "string" },
          name_ar: { type: "string", nullable: true },
          dose: { type: "string" },
          frequency: { type: "string" },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date", nullable: true },
          notes: { type: "string", nullable: true },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          provider_name: { type: "string" },
          location: { type: "string", nullable: true },
          scheduled_at: { type: "string", format: "date-time" },
          notes: { type: "string", nullable: true },
          source: { type: "string", enum: ["manual", "smart_scan"] },
        },
      },
      MedicalRecord: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          kind: {
            type: "string",
            enum: ["lab", "imaging", "prescription", "discharge_summary", "report", "other"],
          },
          title: { type: "string" },
          title_ar: { type: "string", nullable: true },
          file_url: { type: "string", format: "uri", nullable: true },
          extracted_text: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ScanResult: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          step: { type: "integer", minimum: 1, maximum: 5 },
          enhanced_image_url: { type: "string", format: "uri" },
          extracted: { type: "object", additionalProperties: true },
        },
      },
      ChatMessage: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          role: { type: "string", enum: ["user", "assistant", "system"] },
          content: { type: "string" },
          attachments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["image", "voice", "record_ref"] },
                url: { type: "string", format: "uri", nullable: true },
                record_id: { type: "string", format: "uuid", nullable: true },
              },
            },
          },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ProviderConsent: {
        type: "object",
        description:
          "Patient-granted, time-boxed consent allowing a provider organization (e.g. an insurance company) to access selected EMR resources.",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          provider_org_id: { type: "string", format: "uuid" },
          scopes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "records.read",
                "medications.read",
                "appointments.read",
                "claims.read",
                "claims.write",
              ],
            },
          },
          expires_at: { type: "string", format: "date-time" },
          revoked_at: { type: "string", format: "date-time", nullable: true },
        },
      },
      ProviderEmrBundle: {
        type: "object",
        description: "Aggregated EMR snapshot returned to a consented provider.",
        properties: {
          patient_id: { type: "string", format: "uuid" },
          consent_id: { type: "string", format: "uuid" },
          records: { type: "array", items: { $ref: "#/components/schemas/MedicalRecord" } },
          medications: { type: "array", items: { $ref: "#/components/schemas/Medication" } },
          appointments: { type: "array", items: { $ref: "#/components/schemas/Appointment" } },
          claims: { type: "array", items: { $ref: "#/components/schemas/PatientClaim" } },
        },
      },
      CurrentAuth: {
        type: "object",
        properties: {
          user_id: { type: "string", format: "uuid", nullable: true },
          email: { type: "string", format: "email", nullable: true },
          roles: { type: "array", items: { type: "string" } },
        },
      },
    },
    responses: {
      Error: {
        description: "Error envelope",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
    },
  },
  security: [{ SupabaseJWT: [] }],
  paths: {
    "/rest/v1/subscriptions": {
      get: {
        tags: ["Subscriptions"],
        summary: "subscriptionsClient.getCurrent(deviceId)",
        description: "Returns the user's (or device's) current subscription including trial state.",
        parameters: [
          {
            in: "query",
            name: "device_id",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Current subscription",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Subscription" },
              },
            },
          },
          default: { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/rest/v1/payment_receipts": {
      get: {
        tags: ["Payments"],
        summary: "paymentsClient.list()",
        responses: {
          "200": {
            description: "List of receipts",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PaymentReceipt" },
                },
              },
            },
          },
          default: { $ref: "#/components/responses/Error" },
        },
      },
      post: {
        tags: ["Payments"],
        summary: "paymentsClient.upload(file, meta)",
        description: "Upload a bank-transfer receipt for admin verification.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "amount", "currency"],
                properties: {
                  file: { type: "string", format: "binary" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  subscription_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Receipt created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaymentReceipt" },
              },
            },
          },
          default: { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/rest/v1/payment_receipts/{id}": {
      patch: {
        tags: ["Payments"],
        summary: "paymentsClient.updateStatus(id, { status, reviewer_notes })",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["verified", "rejected"] },
                  reviewer_notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated receipt",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaymentReceipt" },
              },
            },
          },
          default: { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/rest/v1/site_pages": {
      get: {
        tags: ["CMS"],
        summary: "cmsClient.listPages()",
        responses: {
          "200": {
            description: "All CMS pages",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/CmsPage" } },
              },
            },
          },
        },
      },
    },
    "/rest/v1/site_pages/{slug}": {
      get: {
        tags: ["CMS"],
        summary: "cmsClient.getPage(slug)",
        parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Single CMS page",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CmsPage" } },
            },
          },
        },
      },
      patch: {
        tags: ["CMS"],
        summary: "cmsClient.publish(slug, draft)",
        parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
        responses: { "200": { description: "Published" } },
      },
    },
    "/rest/v1/support_tickets": {
      get: {
        tags: ["Tickets"],
        summary: "ticketsClient.list()",
        responses: {
          "200": {
            description: "Tickets",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/SupportTicket" } },
              },
            },
          },
        },
      },
    },
    "/rest/v1/support_tickets/{id}": {
      patch: {
        tags: ["Tickets"],
        summary: "ticketsClient.updateStatus(id, status)",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["open", "pending", "resolved", "closed"],
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
    },
    "/rest/v1/app_reviews": {
      get: {
        tags: ["Reviews"],
        summary: "reviewsClient.list() / listApproved()",
        parameters: [
          {
            in: "query",
            name: "approved",
            required: false,
            schema: { type: "boolean" },
          },
        ],
        responses: {
          "200": {
            description: "Reviews",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/AppReview" } },
              },
            },
          },
        },
      },
    },
    "/rest/v1/app_reviews/{id}": {
      patch: {
        tags: ["Reviews"],
        summary: "reviewsClient.setApproved(id, approved)",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["approved"],
                properties: { approved: { type: "boolean" } },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Reviews"],
        summary: "reviewsClient.remove(id)",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/rest/v1/patient_claims": {
      get: {
        tags: ["RCM"],
        summary: "rcmClient.listPendingClaims()",
        responses: {
          "200": {
            description: "Pending claims",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/PatientClaim" } },
              },
            },
          },
        },
      },
    },
    "/auth/v1/user": {
      get: {
        tags: ["Auth"],
        summary: "authClient.current()",
        responses: {
          "200": {
            description: "Current authenticated principal",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CurrentAuth" } },
            },
          },
        },
      },
    },
    "/rest/v1/rpc/has_role": {
      post: {
        tags: ["Auth"],
        summary: "authClient.hasAnyRole(roles) / canPerform(action)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  _user_id: { type: "string", format: "uuid" },
                  _role: { type: "string", enum: ["admin", "moderator", "user"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Boolean result",
            content: { "application/json": { schema: { type: "boolean" } } },
          },
        },
      },
    },
  },
} as const;
