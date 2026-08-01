# Domain & Workflows

This page covers the tennis scoring rules as actually implemented, the singles/doubles
participant model, serving rotation, break-point detection, undo semantics, and a high-level
tour of the statistics model. For architecture/module boundaries see
[Architecture](architecture.md). For the exhaustive statistics counter reference, see
[docs/statistics.md](../docs/statistics.md) — this page summarizes; that doc is authoritative.

## Scoring model

All scoring math lives as private methods on
[`TennisMatch`](../src/TennisMatch.ts), driven by the single public mutation method
`scorePoint(winner, outcome, scorerId?, isFirstServe?)`.

- **Points → games**: points are tallied per game via `getNumericPointScores()` (counts
  `currentGamePoints`), then converted to tennis notation by `convertToTennisScore()`:
  `0/15/30/40`, `"DEUCE"` at 3-3+, `"AD IN"`/`"AD OUT"` for advantage (which side is "IN" depends
  on who is currently serving — `getServerPosition()`).
- **Game winner**: `checkGameWinner()` — first to 4+ points win by 2 (regular game) or first to
  7+ points win by 2 (tiebreak).
- **Set winner**: `checkSetWinner()` — first to 6+ games win by 2, or 7-6 via tiebreak. At 6-6,
  `completeGame()` flips `this.tiebreak = true` and resets `pointScores`.
- **Match winner**: `checkMatchWinner()` — first to `ceil(numSets / 2)` sets. `numSets` must be
  odd (constructor throws `Error("Number of sets must be odd")` otherwise).
- **Tiebreak serving**: inside a tiebreak, `updatePointScore()` rotates the server after the 1st
  point, then every 2 points (`totalPoints === 1 || totalPoints % 2 === 1`) — standard tennis
  tiebreak serving rule.
- **New set**: `completeSet()` calls `rotateServer()` once at the end of the set, alternating who
  serves first in the next set.

Break point detection (`checkBreakPoint()`) runs **before** the point is recorded, using
pre-point scores: true when the receiver is one point away from winning the game (receiver at 40
with server below 40, or receiver holding advantage). This flag feeds
`StatisticsManager.recordBreakPoint()` for stat purposes only — it does not change scoring
behavior itself.

## Participants: singles vs. doubles

[`src/participant-factory.ts`](../src/participant-factory.ts) turns constructor input into typed
`Participant` objects (see [`src/types.ts`](../src/types.ts) for the shapes):

- **Singles**: a bare name string (or a `SinglesPlayerConfig`) becomes a `SinglesPlayer`
  (`type: "player"`, `position: 1 | 2`).
- **Doubles**: a `[nameA, nameB]` tuple (or `DoublesTeamConfig`) becomes a `DoublesTeam`
  (`type: "team"`, `position: 1 | 2`, with `players.a`/`players.b` as `TeamPlayer` objects, each
  with their own `id`). `TennisMatch`'s constructor infers `matchType` from
  `participants[1].type`.
- IDs are generated via `generateId(prefix)` (`participant-factory.ts`) — a timestamp + random
  suffix, not sequential — so IDs are stable within a match instance but not guessable/
  predictable across runs. Player/team IDs must be read back from `getMatchSummary()` (e.g.
  `summary.participants[1].info.players.a.id`) to attribute doubles points to a specific player
  via `scorePoint(pos, outcome, scorerId)`.

### Serving rotation (doubles)

`createServingRotation(team1, team2, firstServer)` builds a 4-entry rotation array in serving
order. Standard order: **Team1-A → Team2-A → Team1-B → Team2-B**, then repeats. The default
first server (set in the `TennisMatch` constructor) is `{ team: 1, player: "a" }`. `getNextServer`
looks up the current server's index in the rotation array and returns the next one (throws if the
current server ID isn't found in the rotation — a signal of state corruption if it happens).
`TennisMatch.rotateServer()` calls this after each game (or advances by singles alternation if
`matchType === "singles"`).

## Statistics model (overview)

Statistics bookkeeping is deliberately isolated from scoring logic in
[`src/statistics-aggregator.ts`](../src/statistics-aggregator.ts):

- `createEmptyStats()` / `createEmptyTeamStats()` build zeroed counter objects
  (`ParticipantStatistics` / `TeamStatistics`, the latter adding a `playerStats` map).
- `updateStats(stats, outcome, won, isServing, isFirstServe?)` is a **pure function** — it
  deep-clones and returns a new stats object rather than mutating, based on the `PointOutcome`
  enum (`Ace`, `DoubleFault`, `ServiceWinner`, `ReturnWinner`, `Winner`, `UnforcedError`,
  `ForcedError`, `Regular`).
- `StatisticsManager` is the stateful wrapper `TennisMatch` holds one instance of. Its
  `recordPoint()` is called from `scorePoint()` on every point, for both the winner and loser
  participant. For doubles, if a `scorerId` is passed, `updateTeamStats()` updates both the team
  aggregate and that specific player's `playerStats` entry; if omitted, only the team aggregate is
  updated. The **losing side never gets individual player attribution** in the current design
  (only team aggregate) — except double-faults and unforced errors, where the manager infers an
  `attributionId` (`serverId` for double faults, `scorerId` for unforced errors) so the error can
  still be attributed to a specific player.
- `recordServiceGame()` and `recordBreakPoint()` are called once per completed game (not per
  point) to update `serviceGamesPlayed/Won` and break-point counters — these are **not** updated
  inside `updateStats()`; if you're chasing a stat that looks unwired, check whether it belongs
  in the per-point path (`updateStats`) or the per-game path (`recordServiceGame`/
  `recordBreakPoint`) before assuming a bug.
- `aggregateStats`, `calculatePercentages`, `compareStats` (aka `mergeStats`/`diff` logic) are
  read-side helpers for consumers building UI (e.g. computing first-serve %).

For the full per-`PointOutcome` counter mapping (which field increments for whom, under what
condition), always consult [docs/statistics.md](../docs/statistics.md) rather than re-deriving it
from source — it is kept in sync with `updateStats()`/`updateTeamStats()` and cites exact line
references. `git blame` on `5e46a21` ("improve unforced error collection") is a good example of
how a stats-only change looks: a `statistics-aggregator.ts` diff plus a new
`tests/statistics-collection.test.ts`, no changes to scoring logic.

## Undo semantics (`removePoint`)

[`TennisMatch.removePoint()`](../src/TennisMatch.ts) walks the point/game/set history backwards:

1. If the current game has points, pop the last point and `recalculatePointScore()`.
2. If the current game is empty but the current set has completed games, pop the last completed
   game, restore `gameScores`/`currentServerId` from it, then recurse into `removePoint()` again
   to remove that game's last point.
3. If the current set is also empty, pop the last completed set from `setHistory`, restore
   `setScores`/`gameScores`/tiebreak flag, then recurse to unwind that set's last game.
4. `matchWinner` is always cleared on `removePoint()` — undoing a point can always "un-finish" a
   match.

**Known limitation, not a bug to silently fix**: statistics are *not* rolled back on undo — there
is a literal `// TODO: Update statistics (would need to implement removePoint in
StatisticsManager)` in `TennisMatch.ts`. If a caller displays live stats next to an undo button,
those stats will over-count until a corresponding `StatisticsManager.removePoint()` is
implemented. Any fix here should update `docs/statistics.md` and add a test similar to the
existing `removePoint` cases in `tests/match1.test.ts` / `tests/statistics-collection.test.ts`.

## Persistence / integration points

`TennisMatch` has no built-in backend. Three seams exist for a host application (see README
"Custom Save Behavior" / "Resuming a Match" sections):

- **Default save**: if `saveCallback` isn't passed to the constructor and `localStorage` exists,
  `defaultSaveCallback()` auto-saves `toJSON()` to `localStorage["unifiedTennisMatch"]` after
  every `scorePoint()`/`removePoint()` call.
- **Custom save**: pass a `(match: TennisMatch) => void` callback to the constructor to push state
  to a server/DB instead.
- **Load**: `TennisMatch.load(loader?)` (static) reads from a custom loader function or
  `localStorage` by default, and rebuilds via `fromJSON()`. `fromJSON()` first runs the normal
  constructor (for validation) then overwrites internal fields with the serialized state,
  including restoring the raw `Map` of stats (`SerializedMatch.stats` is a serialized
  `Map.entries()` array).

The only known consumer of this library's public API is the companion front end
[tennisjs-vue](https://github.com/mattriffle/tennisjs-vue) (separate repository, out of scope
here) — it drives matches purely through `scorePoint()`/`getMatchSummary()`/`toJSON()`/
`fromJSON()`, i.e. the exact surface exported from [`src/index.ts`](../src/index.ts).
