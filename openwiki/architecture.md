# Architecture

## Module map

TennisJS is intentionally small — 5 files in `src/`, all ES modules (`"type": "module"` in
`package.json`, compiled with `tsc` to `dist/`).

| File | Responsibility |
|---|---|
| [`src/types.ts`](../src/types.ts) | The shared data model / contract. `Participant`, `SinglesPlayer`, `DoublesTeam`, `TeamPlayer`, `MatchScore`, `PointScore`, `ServingInfo`, `PointOutcome` enum, `ParticipantStatistics`/`TeamStatistics`, `UnifiedMatchSummary` and its sub-summaries (`SetSummary`, `GameSummary`, `PointSummary`, `TiebreakSummary`), `MatchConfig`, `SerializedMatch`, and the type guards `isSinglesPlayer`/`isDoublesTeam`/`isTeamStatistics`. Nothing else in the codebase should redefine these shapes. |
| [`src/TennisMatch.ts`](../src/TennisMatch.ts) | The match state machine. Owns all mutable match state privately (score, set/game history, server rotation, stats manager reference) and exposes a small public API: constructor, `scorePoint()`, `removePoint()`, `getMatchSummary()`, `getMatchScoreString()`, `toJSON()`, `fromJSON()` (static), `load()` (static). All tennis scoring math (point→game→set→match completion, deuce/advantage conversion, tiebreak rules, break-point detection, serving rotation triggers) lives here as private methods. |
| [`src/participant-factory.ts`](../src/participant-factory.ts) | Turns raw constructor input (strings or `[string, string]` tuples, or full config objects) into typed `Participant` objects. Also owns the doubles serving-rotation algorithm (`createServingRotation`, `getNextServer`) and small participant helpers (`getPlayerIds`, `getDisplayName`, `getAbbreviatedName`, `areParticipantsEqual`, `validateParticipantConfig`). |
| [`src/statistics-aggregator.ts`](../src/statistics-aggregator.ts) | Per-point statistics bookkeeping, isolated from scoring logic. `createEmptyStats`/`createEmptyTeamStats` build zeroed counters; `updateStats`/`updateTeamStats` apply one point's effect to one participant's counters; `StatisticsManager` is the stateful wrapper `TennisMatch` holds (`initializeParticipants`, `recordPoint`, `recordServiceGame`, `recordBreakPoint`, `getStats`, `getAllStats`); `aggregateStats`/`calculatePercentages`/`compareStats` are read-side helpers for consumers. |
| [`src/index.ts`](../src/index.ts) | The entire public export surface. If a type or function isn't re-exported here, it isn't part of the package's public API even if it exists in `src/`. When adding new public functionality, add the export here explicitly. |

## Data flow through `scorePoint()`

`TennisMatch.scorePoint(winner, outcome, scorerId?, isFirstServe?)` ([src/TennisMatch.ts:174](../src/TennisMatch.ts)) is the single mutation entry point. Per call:

1. Guard: if `matchWinner` is already set, warn and no-op.
2. Build a `PointSummary` (winner, outcome, server, scorer, timestamp) — score field is a placeholder filled in later.
3. `checkBreakPoint()` is evaluated **before** the point is recorded, using pre-point scores — this determines whether this point counts as a break-point opportunity for stats.
4. `statsManager.recordPoint(...)` updates winner/loser statistics (see [statistics-aggregator.StatisticsManager.recordPoint](../src/statistics-aggregator.ts)), and `recordBreakPoint(...)` is called if step 3 flagged a break point.
5. The point is pushed into `currentGamePoints`, and `updatePointScore()` recomputes `pointScores` (tennis notation like `"30"`/`"DEUCE"`/`"AD IN"` in regular games, raw numbers in tiebreaks) via `convertToTennisScore()`.
6. `checkGameWinner()` — if true, `completeGame()` runs: records the service-game stat, builds a `GameSummary`, pushes it to `currentSetGames`, increments `gameScores`, checks for a 6-6 tiebreak, rotates the server, and recursively checks `checkSetWinner()` → `completeSet()` → `checkMatchWinner()`.
7. `save()` invokes the configured save callback (defaults to writing `toJSON()` into `localStorage` under key `unifiedTennisMatch`, or a custom callback passed to the constructor).

`removePoint()` ([src/TennisMatch.ts:540](../src/TennisMatch.ts)) walks this structure in reverse — popping the last point, or (if the current game/set is empty) popping the last completed game/set and recursing. **Statistics are not currently rolled back on undo** (there's a `TODO` in the source) — this is a known limitation, not a bug to silently "fix" without updating tests/docs.

## Serialization model

`toJSON()`/`fromJSON()` capture the *entire* private match state (config, participants, all
history arrays, serving rotation, current server, all score arrays, and the raw stats map as a
serialized `Map` entries array) — enough to fully reconstruct a `TennisMatch` instance, not just
redraw a scoreboard. `fromJSON` first constructs a fresh match (to run the constructor's
validation/initialization) and then overwrites its internal fields with the serialized values.
`TennisMatch` also exposes a static `load()` that defaults to reading `localStorage` but accepts a
custom loader function — this is the seam integrators use to swap in a database/API instead of
browser storage (see README "Custom Save Behavior" / "Resuming a Match" sections).

## History: why the codebase looks the way it does

Git history shows three distinct eras. Use this to avoid being confused by references to files
that no longer exist, in old docs or old branches:

1. **v1 — vanilla JS** (`8203ad4` initial commit through `d52c860`): plain `js/tennis.js` plus a
   `vanilla_example/` HTML/CSS/JS front end. Still available on the `v1` git branch per the README
   FAQ, but not present on `main`.
2. **v2 — TypeScript, singles-only, then doubles bolted on** (`d52c860` "Typescript conversion"
   through `938c669`/`e23f6ec` "initial doubles support"): introduced separate per-concept classes
   — `Game.ts`, `Point.ts`, `Set.ts`, `TieBreak.ts` — with `TennisMatch.ts` composing them.
3. **v2.x — parallel "unified" model built alongside the legacy one** (`0563c5e` "feat: unified
   API for singles and doubles"): added `unified-types.ts`, `legacy-adapter.ts`,
   `LegacyTennisMatch.ts`, `participant-factory.ts`, `statistics-aggregator.ts` — the unified API
   ran *alongside* the legacy per-concept classes for backward compatibility. The root-level docs
   `implementation-next-steps.md`, `unified-data-model-design.md`, and
   `unified-model-implementation-summary.md` describe this intermediate design and are now
   **historical/superseded** — do not use them as a guide to current file layout.
4. **v3.0 — "Major refactoring — not backwards compatible"** (`7ac7103`): deleted `Game.ts`,
   `Point.ts`, `Set.ts`, `TieBreak.ts`, `LegacyTennisMatch.ts`, `legacy-adapter.ts`, and
   `unified-types.ts` outright. The unified model became *the only* model, folded directly into
   `TennisMatch.ts`/`types.ts`/`participant-factory.ts`/`statistics-aggregator.ts`. This is the
   current architecture described above. Subsequent commits (`5e46a21` "improve unforced error
   collection", `52cef24`/`d121435` README fixes, `7437746` SECURITY.md) are incremental
   maintenance on top of this v3 design — no further structural changes.

**Takeaway for future agents:** if you see a reference to `Game.ts`, `unified-types.ts`,
`legacy-adapter.ts`, etc. in a doc or comment, it is talking about a deleted pre-3.0 design.
Current logic for that concept now lives in `TennisMatch.ts`, `types.ts`, or
`statistics-aggregator.ts` per the module map above.
