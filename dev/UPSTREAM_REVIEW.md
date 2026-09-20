# CIM / BSharp integration review

Reviewed pganssle/cim at `bc23cf04e867b36da5ff19fb769397c488180269` on 2026-09-20.
Source: https://github.com/pganssle/cim

- **Adapted:** complete audio/app precaching (`sw.js`), versioned JSON exports,
  legacy profile defaults, and validation before importing (`js/cim.js`).
  BSharp implements these in TypeScript with its own asset layout. Its worker
  additionally versions releases by content, handles Safari audio range requests,
  and leaves updates waiting until old windows close.
- **Preserved from BSharp:** touch flag controls, onboarding, profile UI, themes,
  random/adaptive selection, piano and both guitar variants, bundled recordings,
  and the existing Android wrapper.
- **Progress portability:** import CIM format 1 and legacy BSharp exports as new
  profiles, retaining existing profiles. Preview before applying, map unsupported
  CIM instruments to piano, retain single-note statistics. No destructive replace
  or heuristic merging of children with the same name.
- **Not ported:** Tone.js runtime sampling, CIM's single-note game flow, and its
  Capacitor/Android distribution machinery. Those are separate feature changes;
  BSharp already has a small complete recording set and an Android wrapper.
  Single-note settings/data remain in backups, but gameplay stays disabled.

The existing Apache-2.0 license and NOTICE attribution remain in place.
