import { TennisMatch, PointOutcomes } from "../src";

describe("Match Completion and Undo/Redo at Match Boundary", () => {
  let match: TennisMatch;

  beforeEach(() => {
    match = new TennisMatch("Player A", "Player B", 3);
  });

  const winGame = (matchInstance: TennisMatch, player: 1 | 2) => {
    for (let i = 0; i < 4; i++) {
      matchInstance.scorePoint(player);
    }
  };

  const winSet = (matchInstance: TennisMatch, player: 1 | 2) => {
    for (let i = 0; i < 6; i++) {
      winGame(matchInstance, player);
    }
  };

  it("should correctly finish a 3-set match and handle undo/redo at the match boundary", () => {
    // Set 1: Player A wins 6-0
    winSet(match, 1);
    let summary = match.matchSummary();
    expect(summary.player1.sets).toBe(1);
    expect(summary.player2.sets).toBe(0);
    expect(match.winner).toBeUndefined();

    // Set 2: Player B wins 6-0
    winSet(match, 2);
    summary = match.matchSummary();
    expect(summary.player1.sets).toBe(1);
    expect(summary.player2.sets).toBe(1);
    expect(match.winner).toBeUndefined();

    // Set 3: Player A wins the set and the match
    for (let i = 0; i < 5; i++) {
      winGame(match, 1);
    }
    summary = match.matchSummary();
    expect(summary.player1.sets).toBe(1);
    expect(summary.player2.sets).toBe(1);
    expect(summary.player1.games).toBe(5);
    expect(summary.player2.games).toBe(0);
    expect(match.winner).toBeUndefined();

    // Win the final game to win the match
    winGame(match, 1);
    summary = match.matchSummary();
    expect(summary.player1.sets).toBe(2);
    expect(summary.player2.sets).toBe(1);
    expect(match.winner).toBe(1);

    // Undo the match-winning point
    match.removePoint();
    summary = match.matchSummary();
    expect(match.winner).toBeUndefined();
    expect(summary.player1.sets).toBe(1);
    expect(summary.player2.sets).toBe(1);
    expect(summary.player1.games).toBe(5);
    expect(summary.player1.points).toBe(40);

    // Undo another point
    match.removePoint();
    summary = match.matchSummary();
    expect(match.winner).toBeUndefined();
    expect(summary.player1.points).toBe(30);

    // Redo the points to win the match again
    match.scorePoint(1);
    match.scorePoint(1);
    summary = match.matchSummary();
    expect(match.winner).toBe(1);
    expect(summary.player1.sets).toBe(2);
    expect(summary.player2.sets).toBe(1);
  });
  it("should correctly save and load a match", () => {
    let savedState: string | null = null;

    const customSaver = (matchToSave: TennisMatch) => {
      const replacer = (key: string, value: any) => {
        if (key === "saveCallback") return undefined;
        return value;
      };
      savedState = JSON.stringify(matchToSave, replacer);
    };

    const customLoader = () => {
      return savedState;
    };

    // Start a match with a custom saver
    const originalMatch = new TennisMatch("Chris", "Pete", 3, customSaver);

    // Play a bit
    winGame(originalMatch, 1); // P1 wins game
    winGame(originalMatch, 1); // P1 wins game
    originalMatch.scorePoint(2); // P2 scores a point
    originalMatch.scorePoint(2); // P2 scores a point

    const summaryBeforeSave = originalMatch.matchSummary();
    expect(summaryBeforeSave.player1.games).toBe(2);
    expect(summaryBeforeSave.player2.points).toBe(30);

    // The save should have been happening automatically, so savedState should be populated
    expect(savedState).not.toBeNull();

    // Now, load a new match from the saved state
    const loadedMatch = TennisMatch.load(customLoader, customSaver);
    expect(loadedMatch).not.toBeNull();

    if (loadedMatch) {
      // Verify the loaded match has the same state
      const summaryAfterLoad = loadedMatch.matchSummary();
      expect(summaryAfterLoad).toEqual(summaryBeforeSave);

      // Continue playing with the loaded match
      loadedMatch.scorePoint(1); // P1 scores -> 15-30
      loadedMatch.scorePoint(1); // P1 scores -> 30-30
      loadedMatch.scorePoint(1); // P1 scores -> 40-30
      loadedMatch.scorePoint(1); // P1 wins game 3

      const finalSummary = loadedMatch.matchSummary();
      expect(finalSummary.player1.games).toBe(3);
      expect(finalSummary.player2.games).toBe(0);
    }
  });
});
