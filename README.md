# Sick New World · Fort Worth planner

A static microsite for planning Sick New World Texas on October 24, 2026.

## Data and Firebase

- The site connects to the same Firebase Realtime Database used by the ski trip planner.
- Sick New World data lives only below the new top-level path `sickNewWorldLineup/profiles/`, with one child for each profile (`tj`, `emma`, `travis`, `sabrina`). Existing branches such as `state`, `scotland2026`, `texasDiveBarPassport`, `viningFamilyChristmas`, and `voter` are not read or written by this site.
- A profile stores artist slugs mapped to priorities (`must`, `love`, `maybe`). Changes write only the affected pick; clearing a profile removes only that person's child under `sickNewWorldLineup/profiles`.
- Existing local picks are merged into Firebase once per browser, without replacing values already present in Firebase. A localStorage cache supports loading and editing while the initial connection is pending.
- `firebase-config.js` uses the client configuration already present in the ski trip planner. This is a browser client configuration, not a service account credential.
- The JSON file `ski-trip-2027-default-rtdb-export (1).json` is a point-in-time export, not the live database. It is left untouched; the site writes directly to the configured Realtime Database.
- The shared passphrase (`SickNewWorld`) is a convenience gate, not real authentication. Firebase rules remain responsible for access control.

## Planner behavior

- Each profile has independent priorities for every artist. Clicking a set cycles through **Must see → Would love → Maybe → unmarked**.
- The profile shortlist shows selected sets in time order. The group plan chooses a non-overlapping schedule maximizing combined priority points across the four profiles (**Must see = 5, Would love = 3, Maybe = 1**).
- The artist placements and set times in `app.js` are placeholders. Replace the `stages` data and `schedule()` logic when the official schedule is announced.
- The browser remembers the last signed-in profile. Other profiles are view-only until selected and signed in.
- The festival map opens full-screen. The mobile layout shows all four stages in separate columns.
