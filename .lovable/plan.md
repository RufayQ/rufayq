## Image thumbnails for milestone attachments

In the Journey milestone sheet, attachments render through `RelatedDocumentsCard`. Today every tile shows a generic icon — `ImageIcon` for images, `FileText` for everything else. The user wants the image tiles to show **actual thumbnails** of the attached file. 【F:src/components/RelatedDocumentsCard.tsx†L335-L347】

### Change

Only `src/components/RelatedDocumentsCard.tsx`. No DB, no storage, no schema change — files already live in the `transport-attachments` private bucket; we just need signed URLs.

1. Add a `thumbs` state: `Record<string /*item.id*/, string /*signedUrl*/>`.
2. After `refresh()` resolves, kick off a single batch:
   - Filter `items` to image mime types we haven't resolved yet.
   - Call `supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 30)` (30-min TTL, well above the time the sheet stays mounted).
   - Merge results into `thumbs`. Failures fall back to the icon — never blank the tile.
3. In the tile's preview box, when `isImage(item.mime_type)` and `thumbs[item.id]` is set, render:
   ```tsx
   <img
     src={thumbs[item.id]}
     alt={item.label}
     loading="lazy"
     decoding="async"
     className="w-full h-full object-cover rounded-lg"
   />
   ```
   Otherwise keep the current `ImageIcon` / `FileText` placeholder. The 14-unit (h-14) box keeps current sizing.
4. Re-resolve when `items` changes (new upload, link-from-records, rename). Tear-down isn't needed — signed URLs are short-lived and the component holds them only in memory.

### Out of scope

- PDF thumbnails (no pdf.js dependency — would inflate the bundle).
- Server-side resized thumbnails. Image attachments here are capped at 10MB and rendered at 110×56; browser-side downscale is fine for this card.
- Touching the non-flight milestones. Today only flight milestones embed `RelatedDocumentsCard`; expanding which milestones get attachments is a separate request.

### Files touched

- `src/components/RelatedDocumentsCard.tsx`
