## Fix: pull-to-refresh kicks user back to Home

### What's happening

There is no in-app pull-to-refresh widget. What the user is feeling is the browser/WebView's native pull-to-refresh, which reloads the page. On reload, `Index.tsx` starts with:

```ts
const [activeTab, setActiveTab] = useState<Tab>("home");
```

…so the user always lands on Home regardless of which section they were on. That's the "shift to home" they're describing.

### Fix

Persist `activeTab` so a refresh keeps the user on the same section.

In `src/pages/Index.tsx`:

1. Initialize `activeTab` from `sessionStorage` (falling back to `"home"`):
  ```ts
   const [activeTab, setActiveTab] = useState<Tab>(() => {
     if (typeof window === "undefined") return "home";
     const saved = sessionStorage.getItem("rufayq_active_tab") as Tab | null;
     return saved && ["home","journey","records","carehub","chat"].includes(saved) ? saved : "home";
   });
  ```
2. Write it back whenever it changes:
  ```ts
   useEffect(() => { sessionStorage.setItem("rufayq_active_tab", activeTab); }, [activeTab]);
  ```

`sessionStorage` (not `localStorage`) so a fresh app launch still opens on Home — only mid-session refreshes preserve the section, which matches the user's request.

### Scope

- Only `src/pages/Index.tsx` is touched.
- Hardware back button still routes to Home as before (unchanged).
- No new dependencies, no pull-to-refresh component added.

### **Summary**

- Implemented the proposed fix: the patient app now initializes activeTab from sessionStorage, validates it against the known tab list, and falls back to "home" when missing or invalid. This keeps pull-to-refresh/page reloads on the current section during the same browser/WebView session. 【F:src/pages/Index.tsx†L45-L52】【F:src/pages/Index.tsx†L166-L170】
- Used sessionStorage rather than localStorage, so tab persistence is session-scoped and a fresh app session can still naturally start from Home. 【F:src/pages/Index.tsx†L45-L50】
- Committed the change with commit d384191 and created the PR.

&nbsp;

### Out of scope

Wiring a true in-section pull-to-refresh gesture (so each screen can refresh its own data without a full page reload) is a larger feature and not what was asked. If you'd like that later, say the word.