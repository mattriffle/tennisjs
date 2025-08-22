import { LegacyTennisMatch, PointOutcomes } from "../src";

describe("Doubles Match Tests", () => {
  describe("Match Initialization", () => {
    it("should create a doubles match with correct team structure", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      expect(match.matchType).toBe("doubles");
      expect(match.teams).toBeDefined();
      expect(match.teams![1].players[0].name).toBe("Alice");
      expect(match.teams![1].players[1].name).toBe("Bob");
      expect(match.teams![2].players[0].name).toBe("Charlie");
      expect(match.teams![2].players[1].name).toBe("Diana");
    });

    it("should initialize serving rotation correctly", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      expect(match.servingRotation).toBeDefined();
      expect(match.servingRotation!.length).toBe(4);
      expect(match.servingRotation![0].name).toBe("Alice");
      expect(match.servingRotation![1].name).toBe("Charlie");
      expect(match.servingRotation![2].name).toBe("Bob");
      expect(match.servingRotation![3].name).toBe("Diana");
    });

    it("should set first server as Team 1 Player A by default", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      const currentServer = match.getCurrentServer();
      expect(currentServer).toEqual(match.servingRotation![0]);
    });
  });

  describe("Serving Rotation", () => {
    const winGame = (match: LegacyTennisMatch, team: 1 | 2) => {
      for (let i = 0; i < 4; i++) {
        match.scorePoint(team);
      }
    };

    it("should follow correct serving order: T1A → T2A → T1B → T2B", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // First game - Alice serves
      let server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");
      winGame(match, 1);

      // Second game - Charlie serves
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Charlie");
      winGame(match, 2);

      // Third game - Bob serves
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Bob");
      winGame(match, 1);

      // Fourth game - Diana serves
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Diana");
      winGame(match, 2);

      // Fifth game - back to Alice
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");
    });

    it("should maintain server throughout entire game", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Alice serves the entire first game
      let server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");

      match.scorePoint(1); // 15-0
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");

      match.scorePoint(2); // 15-15
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");

      match.scorePoint(1); // 30-15
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");

      match.scorePoint(1); // 40-15
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Alice");

      match.scorePoint(1); // Game won

      // Now Charlie should serve
      server = match.getCurrentServer();
      expect((server as any).name).toBe("Charlie");
    });
  });

  describe("Tiebreak Serving", () => {
    const setupTiebreak = (match: LegacyTennisMatch) => {
      // Quick setup to 6-6
      for (let i = 0; i < 6; i++) {
        // Team 1 wins a game
        for (let j = 0; j < 4; j++) {
          match.scorePoint(1);
        }
        // Team 2 wins a game
        for (let j = 0; j < 4; j++) {
          match.scorePoint(2);
        }
      }
    };

    it("should change server after first point in tiebreak", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      setupTiebreak(match);

      // Tiebreak starts with next server in rotation
      let server = match.getCurrentServer();
      const firstServer = (server as any).name;

      // Score first point
      match.scorePoint(1);

      // Server should change after first point
      server = match.getCurrentServer();
      expect((server as any).name).not.toBe(firstServer);
    });

    it("should change server every 2 points after first point", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      setupTiebreak(match);

      // First point
      match.scorePoint(1);
      let server1 = match.getCurrentServer();

      // Second point - same server
      match.scorePoint(1);
      let server2 = match.getCurrentServer();
      expect(server2).toEqual(server1);

      // Third point - server changes
      match.scorePoint(2);
      let server3 = match.getCurrentServer();
      expect(server3).not.toEqual(server2);

      // Fourth point - same server
      match.scorePoint(2);
      let server4 = match.getCurrentServer();
      expect(server4).toEqual(server3);

      // Fifth point - server changes
      match.scorePoint(1);
      let server5 = match.getCurrentServer();
      expect(server5).not.toEqual(server4);
    });
  });

  describe("Individual Player Statistics", () => {
    it("should track points won by each player individually", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Alice scores an ace
      match.scorePoint(1, PointOutcomes.ACE, 0, { team: 1, position: "A" });

      // Bob scores a winner
      match.scorePoint(1, PointOutcomes.WINNER, 0, { team: 1, position: "B" });

      // Charlie scores a return winner
      match.scorePoint(2, PointOutcomes.RETURN_WINNER, 0, {
        team: 2,
        position: "A",
      });

      const summary = match.matchSummary();

      // Check that doubles format is used
      expect(summary.team1).toBeDefined();
      expect(summary.team2).toBeDefined();
      expect(summary.team1!.players.A.stats.servingStats.aces).toBe(1);
      expect(summary.team1!.players.B.stats.rallyStats.winners).toBe(1);
      expect(summary.team2!.players.A.stats.returningStats.returnWinners).toBe(
        1
      );
    });

    it("should track aces for serving player only", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Alice is serving and scores an ace
      match.scorePoint(1, PointOutcomes.ACE, 0, { team: 1, position: "A" });
      match.scorePoint(1, PointOutcomes.ACE, 0, { team: 1, position: "A" });

      const summary = match.matchSummary();
      expect(summary.team1!.players.A.stats.servingStats.aces).toBe(2);
      expect(summary.team1!.players.B.stats.servingStats.aces).toBe(0);
    });

    it("should use scorePointDoubles method correctly", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Use the alternative API
      match.scorePointDoubles(1, "A", PointOutcomes.ACE);
      match.scorePointDoubles(1, "B", PointOutcomes.WINNER);
      match.scorePointDoubles(2, "A", PointOutcomes.UNFORCED_ERROR);

      const summary = match.matchSummary();
      expect(summary.team1!.players.A.stats.servingStats.aces).toBe(1);
      expect(summary.team1!.players.B.stats.rallyStats.winners).toBe(1);
      expect(summary.team2!.players.A.stats.rallyStats.unforcedErrors).toBe(1);
    });
  });

  describe("Score Tracking", () => {
    it("should track team scores correctly", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Team 1 wins first game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(1);
      }

      let summary = match.matchSummary();
      expect(summary.team1!.games).toBe(1);
      expect(summary.team2!.games).toBe(0);

      // Team 2 wins second game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(2);
      }

      summary = match.matchSummary();
      expect(summary.team1!.games).toBe(1);
      expect(summary.team2!.games).toBe(1);
    });

    it("should handle deuce and advantage in doubles", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Get to deuce
      match.scorePoint(1); // 15-0
      match.scorePoint(1); // 30-0
      match.scorePoint(1); // 40-0
      match.scorePoint(2); // 40-15
      match.scorePoint(2); // 40-30
      match.scorePoint(2); // Deuce

      let summary = match.matchSummary();
      expect(summary.team1!.points).toBe("DEUCE");
      expect(summary.team2!.points).toBe("DEUCE");

      // Advantage Team 1
      match.scorePoint(1);
      summary = match.matchSummary();
      expect(summary.team1!.points).toBe("AD IN");

      // Back to deuce
      match.scorePoint(2);
      summary = match.matchSummary();
      expect(summary.team1!.points).toBe("DEUCE");
      expect(summary.team2!.points).toBe("DEUCE");
    });
  });

  describe("Match Summary", () => {
    it("should return correct doubles format for matchSummary", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      const summary = match.matchSummary();

      expect(summary.meta.matchType).toBe("doubles");
      expect(summary.meta.teams).toBeDefined();
      expect(summary.meta.servingRotation).toBeDefined();
      expect(summary.meta.currentServer).toBeDefined();
      expect(summary.team1).toBeDefined();
      expect(summary.team2).toBeDefined();
      expect(summary.player1).toBeUndefined();
      expect(summary.player2).toBeUndefined();
    });

    it("should include all four players in summary", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      const summary = match.matchSummary();

      expect(summary.team1!.players.A.name).toBe("Alice");
      expect(summary.team1!.players.B.name).toBe("Bob");
      expect(summary.team2!.players.A.name).toBe("Charlie");
      expect(summary.team2!.players.B.name).toBe("Diana");
    });
  });

  describe("Undo/Redo Operations", () => {
    it("should undo last point and maintain server", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      const initialServer = match.getCurrentServer();

      match.scorePoint(1);
      match.scorePoint(1);

      let summary = match.matchSummary();
      expect(summary.team1!.points).toBe(30);

      match.removePoint();

      summary = match.matchSummary();
      expect(summary.team1!.points).toBe(15);

      const serverAfterUndo = match.getCurrentServer();
      expect(serverAfterUndo).toEqual(initialServer);
    });

    it("should undo across game boundaries correctly", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      // Win first game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(1);
      }

      let summary = match.matchSummary();
      expect(summary.team1!.games).toBe(1);

      // Undo the game-winning point
      match.removePoint();

      summary = match.matchSummary();
      expect(summary.team1!.games).toBe(0);
      expect(summary.team1!.points).toBe(40);
    });
  });

  describe("Save and Load", () => {
    it("should save doubles match state completely", () => {
      let savedState: string | null = null;

      const customSaver = (matchToSave: LegacyTennisMatch) => {
        const replacer = (key: string, value: any) => {
          if (key === "saveCallback") return undefined;
          return value;
        };
        savedState = JSON.stringify(matchToSave, replacer);
      };

      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3,
        customSaver
      );

      match.scorePoint(1);
      match.scorePoint(2);

      expect(savedState).not.toBeNull();
      const parsed = JSON.parse(savedState!);
      expect(parsed.matchType).toBe("doubles");
      expect(parsed.teams).toBeDefined();
      expect(parsed.servingRotation).toBeDefined();
    });

    it("should load doubles match with all player data", () => {
      let savedState: string | null = null;

      const customSaver = (matchToSave: LegacyTennisMatch) => {
        const replacer = (key: string, value: any) => {
          if (key === "saveCallback") return undefined;
          return value;
        };
        savedState = JSON.stringify(matchToSave, replacer);
      };

      const customLoader = () => savedState;

      const originalMatch = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3,
        customSaver
      );

      // Play some points with individual tracking
      originalMatch.scorePointDoubles(1, "A", PointOutcomes.ACE);
      originalMatch.scorePointDoubles(1, "B", PointOutcomes.WINNER);
      originalMatch.scorePointDoubles(2, "A", PointOutcomes.RETURN_WINNER);

      const originalSummary = originalMatch.matchSummary();

      // Load the match
      const loadedMatch = LegacyTennisMatch.load(customLoader, customSaver);
      expect(loadedMatch).not.toBeNull();

      const loadedSummary = loadedMatch!.matchSummary();

      // Verify the state matches
      expect(loadedSummary.meta.matchType).toBe("doubles");
      expect(loadedSummary.team1!.points).toBe(originalSummary.team1!.points);
      expect(loadedSummary.team2!.points).toBe(originalSummary.team2!.points);
    });
  });

  describe("Backwards Compatibility", () => {
    it("should still support singles matches", () => {
      const match = new LegacyTennisMatch("Alice", "Bob", 3);

      expect(match.matchType).toBe("singles");
      expect(match.player).toBeDefined();
      expect(match.teams).toBeUndefined();

      match.scorePoint(1, PointOutcomes.ACE);

      const summary = match.matchSummary();
      expect(summary.player1).toBeDefined();
      expect(summary.player2).toBeDefined();
      expect(summary.team1).toBeUndefined();
      expect(summary.team2).toBeUndefined();
    });

    it("should detect match type from saved data", () => {
      // Simulate old singles match data
      const oldSinglesData = {
        player: { 1: "Alice", 2: "Bob" },
        numSets: 3,
        score: { 1: 0, 2: 0 },
        sets: [],
        set: {
          winner: 0,
          score: { 1: 0, 2: 0 },
          game: {
            server: 1,
            winner: 0,
            score: { 1: 0, 2: 0 },
            iscore: { 1: 0, 2: 0 },
            points: [],
          },
          games: [],
          tiebreak: null,
        },
      };

      const match = LegacyTennisMatch.fromJSON(oldSinglesData);
      expect(match.matchType).toBe("singles");
    });
  });

  describe("getScore method", () => {
    it("should return correct format for doubles", () => {
      const match = new LegacyTennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3
      );

      match.scorePoint(1);
      match.scorePoint(1);

      const score = match.getScore();

      expect(score.matchType).toBe("doubles");
      expect(score.team1).toBeDefined();
      expect(score.team2).toBeDefined();
      expect(score.team1!.points).toBe(30);
      expect(score.team2!.points).toBe(0);
    });
  });
});
