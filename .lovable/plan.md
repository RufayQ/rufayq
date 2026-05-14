> *Build Traveller Quick Signup as a password-only flow. Add public shelled /quick-signup and /ar/quick-signup routes. Extract phoneToE164, phoneToEmail, and isValidE164 into src/lib/auth/phoneEmail.ts and refactor LoginScreen to use them without behavior changes. Create a bilingual QuickSignup page that collects full name, mobile, password, and terms/privacy acceptance, with optional email/language/nationality. On submit, call Supabase signUp with the synthetic phone email; if the user already exists, fall back to signInWithPassword. Continue only after getUser() returns a real [user.id](http://user.id). Then set rufayq_device_id = auth_${userId}, mark the user fresh, upsert profiles with contact verification pending, upsert medical_profiles, and navigate to /app or /ar/app. Update /auth so Traveller routes to Quick Signup and provider type selection persists rufayq_role="doctor" before existing provider login. Add a Home profile-completion banner with a contact-not-verified row. Rename visible account-type Patient copy to Traveller/مسافر while keeping internal role values unchanged. Do not implement OTP, PIN, provider approval changes, or new auth tables.*

---

**Final decision**

**Approved with the two guardrails above.**

The [Lovable.dev](http://Lovable.dev) plan is aligned with the current product and infrastructure state. It gives users a fast registration path now, keeps the security language honest by marking contact unverified, preserves Provider approval, and leaves OTP/PIN for later when the infrastructure exists.

---

## **Commands used to validate**

- ✅ git status --short
- ✅ rg "quick-signup|handleTravelerClick|provider/login\\?type|phoneToEmail|contact_verified|contact_verification_status|I'm a Patient|Traveler|Patient" -n src/App.tsx src/pages/Auth.tsx src/screens/LoginScreen.tsx src/screens/RoleSelectorScreen.tsx src/integrations/supabase/types.ts supabase/migrations | sed -n '1,220p'
- ✅ nl -ba src/App.tsx | sed -n '96,110p'
- ✅ nl -ba src/components/AppAuthGuard.tsx | sed -n '53,83p'
- ✅ nl -ba src/screens/LoginScreen.tsx | sed -n '250,305p'