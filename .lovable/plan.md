Please implement the safer `MODE=bundled` Capacitor server-stripping flow for Android APK builds.

Important:

- Only touch `scripts/build-android-apk.sh`.

- Do not modify `capacitor.config.ts`.

- Do not modify Gradle files.

- Do not modify the smoke script.

- Do not modify the device-QA wrapper.

- Do not modify CI workflows.

- Do not modify the release AAB script unless separately requested.

- Do not change `MODE=remote` behavior.

If `scripts/build-android-apk.sh` does not exist in this branch, stop and report that this change depends on that file. Do not silently apply this to another script.

---

## Problem to fix

The current APK script’s bundled-mode flow mutates tracked source file `capacitor.config.ts` in place and relies on a `.bak` file plus `trap ... EXIT` to restore it.

That is unsafe because:

- `SIGKILL`, power loss, editor reload, or interrupted runs can leave `capacitor.config.ts` stripped.

- A stale `capacitor.config.ts.bak` can cause the next run to back up an already-stripped file.

- Concurrent builds can race on the same source file.

- User edits during a build can be overwritten by the restore step.

The build script must stop writing to `capacitor.config.ts`.

---

## Desired behavior

For `MODE=bundled`:

1. Build web assets as before.

2. Verify `capacitor.config.ts` still contains the canonical remote server URL:

   `https://rufayq.com`

3. If a stale `capacitor.config.ts.bak` exists from the old script, recover it before any build work:

   - If current `capacitor.config.ts` is missing the canonical server URL and `.bak` contains it, move `.bak` back to `capacitor.config.ts`.

   - Print a warning:

     `[qa] recovered capacitor.config.ts from stale capacitor.config.ts.bak`

   - If both current file and backup are missing the server URL, fail loudly with:

     `git checkout -- capacitor.config.ts`

4. Run `npx cap sync android` normally. This generates:

   `android/app/src/main/assets/capacitor.config.json`

5. Patch only the generated Android JSON:

   `android/app/src/main/assets/capacitor.config.json`

6. Delete the top-level `server` key from that JSON using `node -e` with:

   - `JSON.parse`

   - `delete obj.server`

   - `JSON.stringify(obj, null, 2)`

7. Verify the patched JSON no longer has a `server` key.

8. Print before/after top-level JSON keys so the operator can see that `server` was removed.

9. Continue to Gradle APK build.

10. No restore step is needed because `capacitor.config.ts` was never changed.

For `MODE=remote`:

- Keep behavior unchanged.

- Run `npx cap sync android`.

- Do not patch the generated JSON.

- Verify the generated JSON still has `server.url`.

---

## Required implementation details

Add constants/helpers near the top:

```bash

CANONICAL_SERVER_URL="[https://rufayq.com](https://rufayq.com)"

CAP_CONFIG_TS="capacitor.config.ts"

CAP_CONFIG_BAK="capacitor.config.ts.bak"

ANDROID_CAP_JSON="android/app/src/main/assets/capacitor.config.json"

## **Bundled mode JSON patch**

After npx cap sync android, if MODE=bundled, patch the generated Android JSON.

Use a function like:

`patch_android_capacitor_json_for_bundled() {`  
  `if [ ! -f "$ANDROID_CAP_JSON" ]; then`  
    `echo "[qa] ✗ generated Capacitor JSON not found: $ANDROID_CAP_JSON" >&2`  
    `echo "[qa] Did npx cap sync android complete successfully?" >&2`  
    `exit 2`  
  `fi`  
  
  `echo "[qa] Capacitor JSON keys before bundled patch:"`  
  `node -e "`  
    `const fs = require('fs');`  
    `const p = process.argv[1];`  
    `const obj = JSON.parse(fs.readFileSync(p, 'utf8'));`  
    `console.log(Object.keys(obj).sort().join(', '));`  
  `" "$ANDROID_CAP_JSON"`  
  
  `node -e "`  
    `const fs = require('fs');`  
    `const p = process.argv[1];`  
    `const obj = JSON.parse(fs.readFileSync(p, 'utf8'));`  
    `delete obj.server;`  
    `fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');`  
  `" "$ANDROID_CAP_JSON"`  
  
  `echo "[qa] Capacitor JSON keys after bundled patch:"`  
  `node -e "`  
    `const fs = require('fs');`  
    `const p = process.argv[1];`  
    `const obj = JSON.parse(fs.readFileSync(p, 'utf8'));`  
    `console.log(Object.keys(obj).sort().join(', '));`  
    `if (Object.prototype.hasOwnProperty.call(obj, 'server')) {`  
      `console.error('[qa] ✗ bundled patch failed: generated JSON still contains server');`  
      `process.exit(2);`  
    `}`  
  `" "$ANDROID_CAP_JSON"`  
`}`  


Call this only when:

`if [ "$MODE" = "bundled" ]; then`  
  `patch_android_capacitor_json_for_bundled`  
`fi`  


---

## **Remote mode verification**

For MODE=remote, do not patch the JSON.

Optionally verify the generated JSON still has the canonical server URL:

`verify_remote_json_has_server() {`  
  `node -e "`  
    `const fs = require('fs');`  
    `const p = process.argv[1];`  
    `const expected = process.argv[2];`  
    `const obj = JSON.parse(fs.readFileSync(p, 'utf8'));`  
    `if (!obj.server || obj.server.url !== expected) {`  
      `console.error('[qa] ✗ remote mode expected server.url=' + expected);`  
      `process.exit(2);`  
    `}`  
    `console.log('[qa] remote mode server.url=' + obj.server.url);`  
  `" "$ANDROID_CAP_JSON" "$CANONICAL_SERVER_URL"`  
`}`  


Call this only when:

`if [ "$MODE" = "remote" ]; then`  
  `verify_remote_json_has_server`  
`fi`  


---

## **Remove old unsafe behavior**

Remove any code in scripts/build-android-apk.sh that does this:

`s=s.replace(/server:\s*\{[\s\S]*?\},?/m,'');`  
`fs.writeFileSync('capacitor.config.ts.bak', ...);`  
`fs.writeFileSync('capacitor.config.ts', s);`  
`trap 'mv capacitor.config.ts.bak capacitor.config.ts ...' EXIT`  


The script must not write to capacitor.config.ts at all.

---

## **Logging requirements**

Print clear phase logs:

`[qa] mode: bundled`  
`[qa] variant: Debug`  
`[qa] capacitor.config.ts source integrity: OK`  
`[qa] running npx cap sync android`  
`[qa] generated Capacitor JSON: android/app/src/main/assets/capacitor.config.json`  
`[qa] Capacitor JSON keys before bundled patch: ...`  
`[qa] Capacitor JSON keys after bundled patch: ...`  
`[qa] bundled mode: server removed from generated Android JSON`  


For remote mode:

`[qa] mode: remote`  
`[qa] remote mode: generated Android JSON keeps server.url=https://rufayq.com`  


---

## **Exit codes**

Use exit 2 for preflight/config integrity failures:

- source config missing canonical server URL,
- stale backup cannot be recovered,
- generated JSON missing,
- bundled JSON still contains server after patch,
- remote JSON missing server.url.

Keep existing build/Gradle failure behavior unchanged.

---

## **Acceptance criteria**

1. scripts/build-android-apk.sh no longer writes to capacitor.config.ts.
2. scripts/build-android-apk.sh no longer relies on capacitor.config.ts.bak + trap for normal operation.
3. If stale capacitor.config.ts.bak exists and can safely restore a stripped source config, the script recovers and warns.
4. If capacitor.config.ts lacks https://rufayq.com, the script fails before build with:  
git checkout -- capacitor.config.ts
5. MODE=bundled runs npx cap sync android, then deletes server from:  
android/app/src/main/assets/capacitor.config.json
6. MODE=bundled verifies the generated JSON no longer contains server.
7. MODE=remote behavior is unchanged and generated JSON keeps server.url=https://rufayq.com.
8. Logs print before/after generated JSON top-level keys.
9. bash -n scripts/build-android-apk.sh passes.

10. No changes are made to:
  - capacitor.config.ts
  - Gradle files
  - smoke script
  - device QA wrapper
  - CI workflows
  - release AAB script

`---`  
  
`## My recommendation`  
  
`Approve this enhancement **for the APK script** if that script exists in Lovable’s branch. It is a strong safety improvement.`  
  
`But I would also add a follow-up ticket:`  
  
`> Apply the same “patch generated Android JSON, never mutate capacitor.config.ts” principle to scripts/build-android.sh, because the current release AAB script still mutates capacitor.config.ts and relies on .bak restoration. 【F:scripts/build-android.sh†L38-L50】`  
  
`That should be a separate scoped change because your enhancement explicitly says the release AAB script is out of scope.`  
  
`---`  
  
`## Checks I ran`  
  
`* ✅ git status --short; if [ -f scripts/build-android-apk.sh ]; then nl -ba scripts/build-android-apk.sh | sed -n '1,180p'; else echo 'MISSING scripts/build-android-apk.sh'; fi; nl -ba scripts/build-android.sh | sed -n '38,58p'; nl -ba capacitor.config.ts | sed -n '20,30p'; find scripts -maxdepth 3 -type f -print | sort`  


  
