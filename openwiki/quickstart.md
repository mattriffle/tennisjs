# TennisJS — Quickstart

TennisJS is a small, dependency-free **TypeScript library** (published to npm as `tennisjs`) that
scores tennis matches — singles or doubles — and tracks detailed statistics per point. It has no
backend and no UI: it is a pure state machine that a front end (e.g. the companion
[tennisjs-vue](https://github.com/mattriffle/tennisjs-vue) project) drives by calling
`scorePoint()` and reading `getMatchSummary()`.

```javascript
import { TennisMatch, PointOutcome } from "tennisjs";

const match = new TennisMatch("Player 1", "Player 2", 3); // best-of-3 singles
match.scorePoint(1, PointOutcome.Ace);
console.log(match.getMatchSummary().matchScore); // "0-0" (in progress)
```

See [README.md](../README.md) for the full usage guide (doubles setup, resuming matches,
custom save/load callbacks, migration notes).

## What this wiki covers

| Section | What's in it |
|---|---|
| [Architecture](architecture.md) | Module map, how `scorePoint()` flows through the codebase, the v1→v2→v3 refactor history, and the serialization model |
| [Domain & Workflows](domain-and-workflows.md) | Tennis scoring rules as implemented (games/sets/tiebreak/deuce), singles vs. doubles participant model, serving rotation, break points, undo semantics, statistics overview |
| [Operations & Testing](operations-and-testing.md) | Build/test/publish commands, test file map, CI (this repo's own OpenWiki workflow), historical design docs, and watch-outs for future changes |

For the full statistics counter reference (which counter changes on which `PointOutcome`, for
which participant), see the existing hand-written reference doc:
[docs/statistics.md](../docs/statistics.md) — link to it rather than duplicating it.

## Repository shape

```
src/
  index.ts                  # public export surface (what "import from tennisjs" gives you)
  types.ts                  # the shared data model: Participant, MatchScore, PointOutcome, Statistics, Summary types
  TennisMatch.ts             # the match state machine — scoring, game/set/match completion, undo, serialization
  participant-factory.ts     # participant creation (singles player / doubles team), serving-rotation math
  statistics-aggregator.ts   # per-point statistics bookkeeping (StatisticsManager)
tests/                      # jest test suite (see operations-and-testing.md for the map)
docs/statistics.md          # authoritative statistics counter reference
*.md (root)                 # historical design docs from the pre-3.0 "unified model" migration — superseded, see architecture.md
```

Everything else (build output in `dist/`, `package.json`, `tsconfig.json`, `jest.config.cjs`) is
standard TypeScript library tooling — see [Operations & Testing](operations-and-testing.md).

## Where to start when making a change

1. **Scoring rule change** (deuce, tiebreak, sets) → `src/TennisMatch.ts`, private methods like
   `convertToTennisScore`, `checkGameWinner`, `checkSetWinner`, `checkBreakPoint`. See
   [Domain & Workflows](domain-and-workflows.md).
2. **New/changed statistic** → `src/statistics-aggregator.ts` (`updateStats`/`updateTeamStats`/
   `StatisticsManager.recordPoint`) and update `docs/statistics.md` to match.
3. **Participant/serving-rotation change** (doubles) → `src/participant-factory.ts`
   (`createServingRotation`, `getNextServer`).
4. **New public type or exported function** → add to `src/types.ts` and re-export from
   `src/index.ts` (the export list there is the entire public API surface).
5. Always run `npm test` (jest) after any change — see
   [Operations & Testing](operations-and-testing.md) for the test map and what each file protects.

## Important context you shouldn't have to rediscover

This library went through a **major, breaking refactor** in commit `7ac7103` ("Major refactoring
— not backwards compatible", npm 3.0.0). It deleted the earlier per-concept classes
(`Game.ts`, `Point.ts`, `Set.ts`, `TieBreak.ts`, `LegacyTennisMatch.ts`, `legacy-adapter.ts`,
`unified-types.ts`) and consolidated everything into the four files listed above. The root-level
design docs (`implementation-next-steps.md`, `unified-data-model-design.md`,
`unified-model-implementation-summary.md`) describe that *earlier, now-deleted* intermediate
design — they are historical, not current architecture. Details and full history in
[Architecture](architecture.md).
