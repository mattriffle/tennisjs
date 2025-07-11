<p align="center">
  <a href="https://github.com/mattriffle/tennisjs-vue">
    <img src="https://raw.githubusercontent.com/mattriffle/tennisjs-vue/main/src/assets/tennisjs.png" alt="tennisjs-vue logo" width="200"/>
  </a>
</p>

# TennisJS

## What is it?

A Typescript package for scoring tennis matches, keeping track of each point and how it was won, as well as various statistics. It provides functions enabling the front-end to use either LocalStorage API or a back-end system for persistence.

## Where can I find it?

https://github.com/mattriffle/tennisjs/

-or-

https://tennisjs.org

-or-

`npm install tennisjs`

## Basic Usage

```javascript
import { TennisMatch, PointOutcomes } from "tennisjs";

// Create a new best-of-3 sets match
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

## Where to send bugs?

https://github.com/mattriffle/tennisjs/issues

## What else is available?

A Vue 3 FE utilizing the library is planned for the near future.

## Didn't you used to brag about this library being vanilla Javascript?

Yes. And that version is still available on the v1 branch of the repo. Enjoy. It has both the scoring library and the vanilla HTML/CSS/JS front end.

## What happened to being such a purist?

I ended up doing a lot of Typescript and Vue at work, so I updated this to use (and even more so practice) those skills.

## LICENSE

Copyright 2025 Matthew Riffle

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
