## **Upgrade-Flow Unification Matrix (Tiers / Add-ons / API / UX)**

### **Canonical assumptions (align these first)**

- **Tier codes (canonical)**: `STARTER`, `PRO`, `COMPANION`, `FAMILY`
- **Billing cycles**: `monthly`, `quarterly`, `yearly`
- **Receipt statuses** (`payment_receipts.status`): `pending`, `under_review`, `verified`, `rejected`, `expired`
- **Subscription statuses** (`user_subscriptions.status`): `trial`, `pending_receipt`, `active`, `cancelled`, `expired`

Primary files in current repo:

- Contracts:  
`src/api/contracts/subscriptions.ts`  
`src/api/contracts/payments.ts`
- API clients:  
`src/api/clients/subscriptions.client.ts`  
`src/api/clients/payments.client.ts`
- Plan logic:  
`src/features/subscriptions/logic/statusMachine.ts`  
`src/features/subscriptions/logic/entitlements.ts`
- API docs:  
`src/api/openapi.ts`

---

## **A) Tier/Add-on capability matrix (source-of-truth target)**


| **Tier**  | **Allowed Add-ons**                 | **Core Entitlements (from** `entitlements.ts`**)** | **Upgrade Eligible To** |
| --------- | ----------------------------------- | -------------------------------------------------- | ----------------------- |
| STARTER   | `priority_support`                  | baseline medical records/scanner/chat core         | PRO, COMPANION, FAMILY  |
| PRO       | `priority_support`, `family_addon`  | STARTER + enhanced care/journey capabilities       | COMPANION, FAMILY       |
| COMPANION | `priority_support`, `family_addon`  | PRO + companion workflow unlocks                   | FAMILY                  |
| FAMILY    | `priority_support` (if not bundled) | full family features                               | n/a                     |


> Lovable instruction: move this to one canonical module (e.g. `planCatalog.ts`) and consume it everywhere (UI, API validation, admin review).

---

## **B) End-to-end state matrix (patient + admin)**


| **Flow State ID**         | **DB Row(s)**                                                                                   | **API Method(s) (current structure)**                              | **UI Route/Screen**                       | **Primary Button Label**               | **Next State**                           |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `upgrade_entry`           | none                                                                                            | `subscriptionsClient.getCurrent(deviceId)`                         | Upgrade landing / plan cards              | **Upgrade Now**                        | `package_selected`                       |
| `package_selected`        | local draft only                                                                                | none (client state)                                                | Plan/package selector                     | **Continue to Payment**                | `pending_receipt_created`                |
| `pending_receipt_created` | `payment_receipts` insert with `status=pending`, `requested_plan`, `billing_cycle`, `amount`    | `paymentsClient.createPendingReceipt(...)`                         | Payment step (bank transfer instructions) | **I Have Transferred, Upload Receipt** | `receipt_uploaded`                       |
| `receipt_uploaded`        | same receipt row updated: `status=under_review`, `receipt_file_path`, payer fields              | `paymentsClient.submitReceiptDetails(...)` (+ storage upload path) | Receipt upload confirmation/status page   | **Submit for Review**                  | `awaiting_admin_review`                  |
| `awaiting_admin_review`   | `payment_receipts.status=under_review`                                                          | `paymentsClient.getMine(deviceId)` polling/realtime                | Upgrade status page                       | **View Request Status**                | `approved_activated` or `rejected_retry` |
| `admin_queue_new`         | receipt rows `pending/under_review`                                                             | `paymentsClient.listAll()` (admin)                                 | Admin receipts table                      | **Start Review**                       | `admin_under_review`                     |
| `admin_under_review`      | row update reviewer fields                                                                      | `paymentsClient.markUnderReview(id, adminId)`                      | Admin receipt detail                      | **Approve & Activate** / **Reject**    | `admin_approved` or `admin_rejected`     |
| `admin_approved`          | receipt row `verified`; new `user_subscriptions` row `active`; previous active expired          | `paymentsClient.verifyAndActivate(receipt)`                        | Admin completion state                    | **Confirm Activation**                 | `approved_activated`                     |
| `approved_activated`      | `user_subscriptions.status=active`, `plan=requested_plan`; receipt linked via `subscription_id` | `subscriptionsClient.getCurrent(deviceId)`                         | Patient subscription summary              | **Manage Plan**                        | steady state                             |
| `admin_rejected`          | receipt row `rejected` + reason                                                                 | `paymentsClient.reject(id, reason)`                                | Admin receipt detail                      | **Reject Request**                     | `rejected_retry`                         |
| `rejected_retry`          | rejected receipt exists                                                                         | `paymentsClient.createPendingReceipt(...)` again                   | Patient rejection/retry page              | **Retry Upgrade**                      | `package_selected`                       |


---

## **C) API mapping matrix (what each UI action must call)**


| **UX Action**              | **API Client Method**                                       | **Table Mutations**                                          | **Required Payload**                                                 | **Failure UX**                               |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------- |
| Enter upgrade page         | `subscriptionsClient.getCurrent(deviceId)`                  | none                                                         | `deviceId`                                                           | show retry + cached plan fallback            |
| Choose plan/cycle/add-ons  | none (local)                                                | none                                                         | canonical `plan_code`, cycle, add-ons                                | disable continue if invalid combo            |
| Start payment              | `paymentsClient.createPendingReceipt(...)`                  | `payment_receipts` INSERT                                    | `device_id`, `requested_plan`, `billing_cycle`, `amount`, `currency` | toast + stay on step                         |
| Upload receipt             | storage upload + `paymentsClient.submitReceiptDetails(...)` | `payment_receipts` UPDATE -> `under_review`                  | `id`, `receipt_file_path`, payer/reference data                      | keep draft, allow re-upload                  |
| Refresh status             | `paymentsClient.getMine(deviceId)`                          | none                                                         | `deviceId`                                                           | status card with retry                       |
| Admin open queue           | `paymentsClient.listAll()`                                  | none                                                         | none                                                                 | admin error banner                           |
| Admin approve              | `paymentsClient.verifyAndActivate(receipt)`                 | expire old sub, insert active sub, update receipt `verified` | receipt row (validated)                                              | non-destructive error, no partial UI success |
| Admin reject               | `paymentsClient.reject(id, reason)`                         | receipt UPDATE `rejected`                                    | `id`, reason                                                         | inline validation                            |
| Post-approval user refresh | `subscriptionsClient.getCurrent(deviceId)`                  | none                                                         | `deviceId`                                                           | “activation pending sync” state              |


---

## **D) UI route + CTA unification map**


| **Route (target naming)**      | **Step**                   | **Must Read From**           | **Must Write To**                  | **CTA**                         |
| ------------------------------ | -------------------------- | ---------------------------- | ---------------------------------- | ------------------------------- |
| `/upgrade`                     | Tier cards                 | current sub + plan catalog   | selected plan draft                | **Upgrade Now**                 |
| `/upgrade/package`             | Package details / add-ons  | plan catalog                 | draft (`plan`, `cycle`, `addons`)  | **Continue to Payment**         |
| `/upgrade/payment`             | Bank transfer instructions | draft                        | pending receipt row                | **Create Upgrade Request**      |
| `/upgrade/receipt-upload`      | Proof upload               | pending receipt id           | receipt file + under_review update | **Submit Receipt**              |
| `/upgrade/status`              | Await admin decision       | receipt status + current sub | none                               | **Refresh Status**              |
| `/upgrade/success`             | Activation confirmed       | current active subscription  | none                               | **Done / Manage Plan**          |
| `/admin/payments/receipts`     | Admin queue                | all receipts                 | review status                      | **Start Review**                |
| `/admin/payments/receipts/:id` | Admin decision             | receipt + request context    | approve/reject mutations           | **Approve & Activate / Reject** |


---

## **E) Guard rules (to prevent “menu shows but not functional”)**


| **Guard**             | **Condition**                        | **Behavior**                               |
| --------------------- | ------------------------------------ | ------------------------------------------ |
| Continue disabled     | no valid tier selected               | disable button + helper text               |
| Continue disabled     | selected add-on not allowed for tier | show inline compatibility error            |
| Payment step blocked  | no draft package                     | redirect to `/upgrade/package`             |
| Upload step blocked   | no pending receipt id                | call createPendingReceipt or redirect back |
| Status step blocked   | no submitted receipt                 | redirect to upload step                    |
| Success step blocked  | no active upgraded subscription      | keep on status page                        |
| Admin approve blocked | missing approval tier confirmation   | require explicit confirm                   |


---

## **F) Lovable one-shot implementation prompt (paste this)**

“Implement upgrade-flow unification using the matrix above.  
Use a single canonical plan catalog for tiers/add-ons and refactor `subscriptions` + `payments` contracts/clients/UI to consume it.  
Wire each CTA to the mapped API method and enforce guard rules so the user can always progress deterministically:  
tier selection → pending receipt creation → receipt upload under review → admin approval/rejection → activation/retry.  
Update `openapi.ts` with explicit upgrade orchestration schemas and align labels/statuses with runtime values.  
Return changed files + diff + short validation results for each matrix state.”

  
