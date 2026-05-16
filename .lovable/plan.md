## Show the real contact in Chat → Contact info

Today the contact info screen always shows a generic "Conversation" title, a single-letter initial, and no avatar — even when the other participant has a name or a Google profile picture. We'll resolve the actual other-user identity and add real avatar support with the priority you chose.

### Avatar resolution order (per your choice)

For each direct thread, the other participant's avatar is picked using the first source that exists:

1. **Uploaded avatar** — `profiles.avatar_url` (new column, backed by a public `avatars` storage bucket).
2. **Google profile picture** — pulled from the linked Google identity for users with `profiles.google_sub` set.
3. **Initials fallback** — first letter of the resolved name on a colored circle (current look, but using the real name).

For provider threads we keep the clinic look (stethoscope on teal) — your earlier provider design stays as-is.

### Name source

As you chose, the name shown is **`chat_participants.display_name`** for the other device on the thread (already fetched by `ConversationProfile`). If it's null, we fall back to `profiles.full_name_en` / `full_name_ar`, then to `rufayq_id`, then to "Conversation". Same resolver used by the chat inbox row so the two screens never disagree.

### Backend changes

```text
profiles
├── avatar_url           text         (uploaded photo public URL)
└── google_picture_url   text         (cached from Google identity on link)

storage.buckets
└── avatars              public = true
    policies:
      • public read
      • owner (device_id match) can insert / update / delete own folder
```

- Migration adds the two columns and the `avatars` bucket + RLS.
- `google_picture_url` is populated by the existing Google-link flow (`profiles.google_*` already exists) — we extend the linker to also store the `picture` claim. No new OAuth scope; `profile` already grants it.

### Frontend changes

1. **New `src/lib/contactResolver.ts`**
   - `resolveContact(threadId, kind)` → `{ name, nameAr, avatarUrl, initials, source: "upload" | "google" | "initials" }`.
   - Single query that joins `chat_participants` → `profiles` for the other device on the thread.
   - Picks `avatar_url` → `google_picture_url` → null.
   - Shared by `ConversationProfile`, `HumanChatView` header, and `ChatInbox` row so every chat surface shows the same identity.

2. **`ConversationProfile.tsx`**
   - Replace the hero block: render avatar `<img>` when `avatarUrl` exists, otherwise the current gold-ringed initials circle.
   - Replace the white-on-gradient `title` text with the resolved EN name, plus Arabic name underneath in `font-arabic` (mirrors the rest of the app).
   - Keep the existing stats / actions sections untouched.

3. **`HumanChatView.tsx` header + `ChatInbox` row**
   - Same resolver, same avatar component, so the bubble in the inbox, the small avatar in the chat header, and the big avatar in Contact info all match.

4. **`src/components/profile/AvatarUploader.tsx`** (new, used from the existing Profile screen)
   - Tap → file picker → uploads to `avatars/{device_id}/avatar.jpg` via `supabase.storage` → writes the public URL into `profiles.avatar_url`.
   - Bilingual toast on success / failure (sonner, matches the project's notification pattern).
   - Wired into `ProfileScreen.tsx` as a new row at the top of the identity card.

### Out of scope

- Editing the other user's photo (only your own).
- Avatar cropping UI — we upload the picked file as-is for v1.
- Per-message sender avatars inside the chat bubble list (header + contact info only for now).
- Provider/clinic logos — providers keep the existing stethoscope mark.

### Files touched

- `supabase/migrations/<new>.sql` — `avatar_url`, `google_picture_url`, `avatars` bucket + policies
- `src/integrations/lovable/*` (auto) — extend Google link to capture `picture`
- `src/lib/contactResolver.ts` (new)
- `src/components/chat/ConversationProfile.tsx`
- `src/components/chat/HumanChatView.tsx`
- `src/components/chat/ChatInbox.tsx`
- `src/components/profile/AvatarUploader.tsx` (new)
- `src/screens/ProfileScreen.tsx`
