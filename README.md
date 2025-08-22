<p>
  <a href="https://github.com/mattriffle/tennisjs">
    <img src="https://raw.githubusercontent.com/mattriffle/tennisjs-vue/main/src/assets/tennisjs.png" alt="tennisjs-vue logo" width="200"/>
  </a>
</p>

## What is it?

A Typescript package for scoring tennis matches, keeping track of each point and how it was won, as well as various statistics. It provides functions enabling the front-end to use either LocalStorage API or a back-end system for persistence.

**Version 2.2+ Features:**

- **Unified API**: Consistent interface for both singles and doubles matches
- **Enhanced Statistics**: Comprehensive player and team statistics
- **Legacy Compatibility**: Full backward compatibility with existing code
- **Better TypeScript Support**: Improved type safety and developer experience

## Where can I find it?

https://github.com/mattriffle/tennisjs/

-or-

https://tennisjs.org

-or-

`npm install tennisjs`

## Is there an FE available?

Find TennisJS Vue at: https://github.com/mattriffle/tennisjs-vue/

## Basic Usage

### New Unified API (Recommended)

The new unified API provides a consistent interface for both singles and doubles matches with enhanced features and better type safety.

#### Singles Match

```javascript
import { TennisMatch, PointOutcome } from "tennisjs";

// Create a new best-of-3 sets singles match
const match = new TennisMatch("Player 1", "Player 2", 3);

// Score a point for Player 1 (Ace)
match.scorePoint(1, PointOutcome.Ace);

// Score a point for Player 2 (Winner)
match.scorePoint(2, PointOutcome.Winner);

// Get a comprehensive match summary
const summary = match.getMatchSummary();
console.log(summary);

// Get a simple string representation of the score
console.log(summary.matchScore); // e.g., "6-3, 4-6, 2-0"

// Undo the last point
match.removePoint();

// Save/load match state
const json = match.toJSON();
const restoredMatch = TennisMatch.fromJSON(json);
```

#### Doubles Match

```javascript
import { TennisMatch, PointOutcome } from "tennisjs";

// Create a new best-of-3 sets doubles match
const doublesMatch = new TennisMatch(
  ["Alice", "Bob"], // Team 1
  ["Charlie", "Diana"], // Team 2
  3
);

// Get player IDs from the match summary
const summary = doublesMatch.getMatchSummary();
const aliceId = summary.participants[1].info.players.a.id;
const bobId = summary.participants[1].info.players.b.id;
const charlieId = summary.participants[2].info.players.a.id;
const dianaId = summary.participants[2].info.players.b.id;

// Score a point for Team 1 (Ace by Alice)
doublesMatch.scorePoint(1, PointOutcome.Ace, aliceId);

// Score a point for Team 2 (Winner by Charlie)
doublesMatch.scorePoint(2, PointOutcome.Winner, charlieId);

// Get updated match summary with individual player statistics
const updatedSummary = doublesMatch.getMatchSummary();
console.log(updatedSummary.participants[1].stats); // Team 1 stats
console.log(updatedSummary.score.server.current); // Current server ID

// Serving rotation is handled automatically
console.log(updatedSummary.score.server.rotation); // Current rotation order
```

### Legacy API (Backward Compatibility)

The original API is still available for existing projects. New projects should use the unified API above.

#### Legacy Singles Match

```javascript
import { TennisMatch, PointOutcomes } from "tennisjs";

// Create a new best-of-3 sets singles match
const match = new TennisMatch("Player 1", "Player 2", 3);

// Score a point for Player 1 (Ace)
match.scorePoint(1, PointOutcomes.ACE);

// Score a point for Player 2 (Winner)
match.scorePoint(2, PointOutcomes.WINNER);

// Get a summary of the current match state
const summary = match.matchSummary();
console.log(summary);

// Get a simple string representation of the score
console.log(match.matchScore(1)); // Score from Player 1's perspective

// Undo the last point
match.removePoint();
```

### Legacy Doubles Match

```javascript
import { TennisMatch, PointOutcomes } from "tennisjs";

// Create a new best-of-3 sets doubles match
const doublesMatch = new TennisMatch(
  ["Alice", "Bob"], // Team 1
  ["Charlie", "Diana"], // Team 2
  3
);

// Score a point for Team 1 with individual player tracking
doublesMatch.scorePoint(
  1, // Team 1 wins the point
  PointOutcomes.ACE, // It was an ace
  0, // No faults
  { team: 1, position: "A" } // Alice scored the ace
);

// Alternative API for doubles - more explicit
doublesMatch.scorePointDoubles(
  1, // Team 1 wins
  "B", // Player B (Bob) scored
  PointOutcomes.WINNER // It was a winner
);

// Get match summary with individual player statistics
const summary = doublesMatch.matchSummary();
console.log(summary.team1.players.A.stats); // Alice's individual stats
console.log(summary.team1.players.B.stats); // Bob's individual stats

// Serving rotation is handled automatically
// Order: Team1-PlayerA → Team2-PlayerA → Team1-PlayerB → Team2-PlayerB → repeat
const currentServer = doublesMatch.getCurrentServer();
console.log(`Current server: ${currentServer.name}`);
```

### Resuming a Match

#### New Unified API

```javascript
import { UnifiedTennisMatch } from "tennisjs";

// Load from localStorage (default)
const resumedMatch = TennisMatch.load();

if (resumedMatch) {
  console.log("Match resumed!", resumedMatch.getMatchSummary());
} else {
  console.log("No saved match found.");
}

// Load from custom source
const customLoader = () => {
  // Load from your custom storage (database, API, etc.)
  return localStorage.getItem("myCustomMatch");
};

const customMatch = TennisMatch.load(customLoader);
```

#### Legacy API

```javascript
import { TennisMatch } from "tennisjs";

const resumedMatch = TennisMatch.load();

if (resumedMatch) {
  console.log("Match resumed!", resumedMatch.matchSummary());
} else {
  console.log("No saved match found.");
}
```

### Custom Save Behavior

#### New Unified API

```javascript
import { TennisMatch } from "tennisjs";

const customSave = (match) => {
  // Example: Send the match state to a server
  // fetch('/api/save-match', {
  //   method: 'POST',
  //   body: JSON.stringify(match.toJSON()),
  // });
  console.log("Match state saved!", match.toJSON());
};

const match = new TennisMatch("Player 1", "Player 2", 3, customSave);

match.scorePoint(1);

// Manual save
const json = match.toJSON();
localStorage.setItem("myMatch", JSON.stringify(json));

// Manual load
const savedJson = JSON.parse(localStorage.getItem("myMatch") || "{}");
const restoredMatch = TennisMatch.fromJSON(savedJson);
```

#### Legacy API

```javascript
import { TennisMatch } from "tennisjs";

const customSave = (match) => {
  // Example: Send the match state to a server
  // fetch('/api/save-match', {
  //   method: 'POST',
  //   body: JSON.stringify(match),
  // });
  console.log("Match state saved!", match);
};

const match = new TennisMatch("Player 1", "Player 2", 3, customSave);

match.scorePoint(1);

const customLoader = () => {
  // Example: retrieve the match state from a variable or async source
  // return mySavedMatchJSON;
  return null;
};

const loadedMatch = TennisMatch.load(customLoader);
```

## Legacy Compatibility Features

The unified API includes comprehensive backward compatibility features to ensure existing projects can continue working while gradually migrating to the new API.

### Automatic Legacy Format Conversion

The `TennisMatch` class provides methods that automatically convert between the new unified format and the legacy format:

```javascript
import { TennisMatch, PointOutcome } from "tennisjs";

// Create a match with the new API
const match = new TennisMatch("Player 1", "Player 2", 3);
match.scorePoint(1, PointOutcome.Ace);

// Get legacy-compatible score format
const legacyScore = match.getScore();
console.log(legacyScore.player1.points); // 15

// Get legacy-compatible match summary
const legacySummary = match.matchSummary();
console.log(legacySummary.player1); // Legacy format

// The new API is fully compatible with legacy expectations
console.log(legacySummary.meta.matchType); // "singles"
```

### Legacy API Methods Available on UnifiedTennisMatch

All legacy methods are available on the new `TennisMatch` class:

```javascript
const match = new TennisMatch("Player 1", "Player 2", 3);

// Legacy methods work seamlessly
match.scorePoint(1, "ACE"); // String outcomes still work
const summary = match.matchSummary(); // Legacy format
const score = match.getScore(); // Legacy format

// New methods provide enhanced features
const unifiedSummary = match.getMatchSummary(); // New unified format
const json = match.toJSON(); // New serialization
```

### Migration Path

#### Phase 1: Drop-in Replacement

```javascript
// Before (old API)
import { LegacyTennisMatch } from "tennisjs";
const match = new LegacyTennisMatch("P1", "P2", 3);

// After (new API - minimal changes)
import { TennisMatch } from "tennisjs";
const match = new TennisMatch("P1", "P2", 3);
// All existing methods work exactly the same
```

#### Phase 2: Enhanced Features

// Gradually adopt new features
const match = new TennisMatch("P1", "P2", 3);

// Keep using legacy methods
match.scorePoint(1, PointOutcome.Ace);

// Start using new features alongside legacy
const unifiedSummary = match.getMatchSummary(); // New format
const legacySummary = match.matchSummary(); // Legacy format

````

#### Phase 3: Full Migration

```javascript
// Complete migration to new API
import { TennisMatch, PointOutcome } from "tennisjs";

const match = new TennisMatch("P1", "P2", 3);
match.scorePoint(1, PointOutcome.Ace); // New enum

const summary = match.getMatchSummary(); // New format
const json = match.toJSON(); // New serialization
````

### Benefits of Migrating

- **Better Type Safety**: Full TypeScript support with proper enums
- **Enhanced Features**: Individual player stats, better serialization
- **Consistent API**: Same interface for singles and doubles
- **Future-Proof**: All new features will be added to the unified API
- **Backward Compatible**: Legacy code continues to work

## Unified Doubles Support Features

The unified API provides enhanced doubles support with consistent behavior across both singles and doubles matches.

### Serving Rotation

- **Regular Games**: One player serves the entire game
- **Rotation Order**: Team1-PlayerA → Team2-PlayerA → Team1-PlayerB → Team2-PlayerB → repeat
- **Tiebreak**: Server changes after 1st point, then every 2 points
- **New Set**: The team that received first in the previous set serves first

### Individual Player Statistics

Each player in doubles has comprehensive individual statistics tracked:

- **Serving Stats**: Aces, double faults, service winners, first/second serve percentage
- **Return Stats**: Return winners, break points won/played
- **Rally Stats**: Winners, unforced errors, net points
- **Overall**: Points won/played, service games played

### Enhanced Match Summary Structure

```javascript
// Unified match summary (works for both singles and doubles)
{
  meta: {
    matchType: 'doubles',
    status: 'in-progress',
    format: { sets: 3, tiebreakAt: 6, finalSetTiebreak: true }
  },
  score: {
    sets: [1, 0],
    games: [3, 2],
    points: { values: [15, 0], type: 'game' },
    server: {
      current: 'player-id',
      rotation: ['p1-a', 'p2-a', 'p1-b', 'p2-b']
    },
    winner: undefined
  },
  participants: {
    1: {
      info: { name: 'Team 1', type: 'team', players: { a: {...}, b: {...} } },
      stats: {
        // Team-level stats
        serving: { aces: 2, doubleFaults: 0 },
        // Individual player stats
        playerStats: {
          'player-a-id': { serving: { aces: 1 } },
          'player-b-id': { serving: { aces: 1 } }
        }
      }
    },
    2: { /* same structure */ }
  },
  matchScore: '6-3, 3-2',
  setHistory: [/* completed sets */]
}
```

### Player-Specific Scoring

```javascript
import { TennisMatch, PointOutcome } from "tennisjs";

const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

// Get player IDs from the match participants
const summary = match.getMatchSummary();
const aliceId = summary.participants[1].info.players.a.id;
const bobId = summary.participants[1].info.players.b.id;
const charlieId = summary.participants[2].info.players.a.id;
const dianaId = summary.participants[2].info.players.b.id;

// Score a point with specific player attribution
match.scorePoint(1, PointOutcome.Ace, aliceId);

// Get individual player stats
const updatedSummary = match.getMatchSummary();
const aliceStats = updatedSummary.participants[1].stats.playerStats?.[aliceId];
console.log(`Alice's aces: ${aliceStats?.serving.aces}`);

// You can also access team-level stats
const team1Stats = updatedSummary.participants[1].stats;
console.log(`Team 1 total aces: ${team1Stats.serving.aces}`);
```

## Where to send bugs?

https://github.com/mattriffle/tennisjs/issues

## Didn't you used to brag about this library being vanilla Javascript?

Yes. And that version is still available on the v1 branch of the repo. Enjoy. It has both the scoring library and the vanilla HTML/CSS/JS front end.

## What happened to being such a purist?

I ended up doing a lot of Typescript and Vue at work, so I updated this to use (and even more so practice) those skills.

## LICENSE

Copyright 2025 Matthew Riffle

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
