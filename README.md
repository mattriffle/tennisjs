<p>
  <a href="https://github.com/mattriffle/tennisjs">
    <img src="https://raw.githubusercontent.com/mattriffle/tennisjs-vue/main/src/assets/tennisjs.png" alt="tennisjs-vue logo" width="200"/>
  </a>
</p>

## What is it?

A Typescript package for scoring tennis matches, keeping track of each point and how it was won, as well as various statistics. It provides functions enabling the front-end to use either LocalStorage API or a back-end system for persistence.

## Where can I find it?

https://github.com/mattriffle/tennisjs/

-or-

https://tennisjs.org

-or-

`npm install tennisjs`

## Is there an FE available?

Find TennisJS Vue at: https://github.com/mattriffle/tennisjs-vue/

## Basic Usage

### Singles Match

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

### Doubles Match (New in v2.1)

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

To resume a match, use the static `TennisMatch.load()` method. By default, it will try to load the match from `localStorage`.

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

You can provide a callback function to the constructor to override the default `localStorage` behavior. This is useful for saving the match state to a different storage, like a back-end server.

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
```

You can also provide a custom loader function to `TennisMatch.load()` to retrieve the saved match from another source.

```javascript
import { TennisMatch } from "tennisjs";

const customLoader = () => {
  // Example: retrieve the match state from a variable or async source
  // return mySavedMatchJSON;
  return null;
};

const match = TennisMatch.load(customLoader);
```

## Doubles Support Features

### Serving Rotation

- **Regular Games**: One player serves the entire game
- **Rotation Order**: T1-A → T2-A → T1-B → T2-B → repeat
- **Tiebreak**: Server changes after 1st point, then every 2 points
- **New Set**: The team that received first in the previous set serves first

### Individual Player Statistics

Each player in doubles has individual statistics tracked:

- Points won/played
- Aces (when serving)
- Double faults (when serving)
- Service winners
- Return winners (when receiving)
- Winners and unforced errors
- Break points won/played

### Match Summary Structure

```javascript
// Singles match summary
{
  meta: { matchType: 'singles', ... },
  player1: { sets, games, points, stats },
  player2: { sets, games, points, stats }
}

// Doubles match summary
{
  meta: {
    matchType: 'doubles',
    currentServer: { name, team, position },
    teams: { 1: Team, 2: Team },
    servingRotation: Player[],
    ...
  },
  team1: {
    sets, games, points,
    players: {
      A: { name, stats: { /* individual stats */ } },
      B: { name, stats: { /* individual stats */ } }
    }
  },
  team2: { /* same structure */ }
}
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
