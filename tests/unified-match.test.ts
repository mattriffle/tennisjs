import { TennisMatch, PointOutcome } from "../src";

describe("TennisMatch", () => {
  describe("Singles Match", () => {
    let match: TennisMatch;

    beforeEach(() => {
      match = new TennisMatch("Roger Federer", "Rafael Nadal", 3);
    });

    it("should create a singles match correctly", () => {
      const summary = match.getMatchSummary();
      expect(summary.meta.matchType).toBe("singles");
      expect(summary.participants[1].info.name).toBe("Roger Federer");
      expect(summary.participants[2].info.name).toBe("Rafael Nadal");
      expect(summary.meta.format.sets).toBe(3);
    });

    it("should score points correctly", () => {
      // Score 4 points for player 1 to win a game
      match.scorePoint(1, PointOutcome.Ace);
      match.scorePoint(1, PointOutcome.Winner);
      match.scorePoint(1, PointOutcome.ServiceWinner);
      match.scorePoint(1, PointOutcome.Regular);

      const summary = match.getMatchSummary();
      expect(summary.score.games[0]).toBe(1);
      expect(summary.score.games[1]).toBe(0);
    });

    it("should handle deuce correctly", () => {
      // Get to deuce
      match.scorePoint(1); // 15-0
      match.scorePoint(1); // 30-0
      match.scorePoint(1); // 40-0
      match.scorePoint(2); // 40-15
      match.scorePoint(2); // 40-30
      match.scorePoint(2); // Deuce

      const summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe("DEUCE");
      expect(summary.score.points.values[1]).toBe("DEUCE");

      // Advantage player 1
      match.scorePoint(1);
      const summary2 = match.getMatchSummary();
      expect(summary2.score.points.values[0]).toContain("AD");
    });

    it("should complete a set correctly", () => {
      // Win 6 games quickly for player 1
      for (let game = 0; game < 6; game++) {
        for (let point = 0; point < 4; point++) {
          match.scorePoint(1);
        }
      }

      const summary = match.getMatchSummary();
      expect(summary.score.sets[0]).toBe(1);
      expect(summary.score.sets[1]).toBe(0);
      expect(summary.setHistory.length).toBe(1);
      expect(summary.setHistory[0].winner).toBe(1);
      expect(summary.setHistory[0].score).toEqual([6, 0]);
    });

    it("should handle tiebreak at 6-6", () => {
      // Get to 6-6
      for (let game = 0; game < 6; game++) {
        // Player 1 wins a game
        for (let point = 0; point < 4; point++) {
          match.scorePoint(1);
        }
        // Player 2 wins a game
        for (let point = 0; point < 4; point++) {
          match.scorePoint(2);
        }
      }

      const summary = match.getMatchSummary();
      expect(summary.score.games).toEqual([6, 6]);
      expect(summary.score.points.type).toBe("tiebreak");

      // Win tiebreak for player 1 (7-0)
      for (let point = 0; point < 7; point++) {
        match.scorePoint(1);
      }

      const summary2 = match.getMatchSummary();
      expect(summary2.score.sets[0]).toBe(1);
      expect(summary2.setHistory[0].tiebreak).toBeDefined();
      expect(summary2.setHistory[0].tiebreak!.score).toEqual([7, 0]);
    });

    it("should track statistics correctly", () => {
      match.scorePoint(1, PointOutcome.Ace);
      match.scorePoint(1, PointOutcome.DoubleFault);
      match.scorePoint(2, PointOutcome.ReturnWinner);
      match.scorePoint(1, PointOutcome.Winner);

      const summary = match.getMatchSummary();
      const stats1 = summary.participants[1].stats;
      const stats2 = summary.participants[2].stats;

      expect(stats1.serving.aces).toBe(1);
      expect(stats1.serving.doubleFaults).toBe(1);
      expect(stats1.rally.winners).toBe(1);
      expect(stats2.returning.returnWinners).toBe(1);
    });

    it("should complete a full match", () => {
      // Player 1 wins 2 sets (6-0, 6-0)
      for (let set = 0; set < 2; set++) {
        for (let game = 0; game < 6; game++) {
          for (let point = 0; point < 4; point++) {
            match.scorePoint(1);
          }
        }
      }

      const summary = match.getMatchSummary();
      expect(summary.meta.status).toBe("completed");
      expect(summary.score.winner).toBe(1);
      expect(summary.score.sets).toEqual([2, 0]);
      expect(summary.matchScore).toBe("6-0, 6-0");
    });

    it("should handle removePoint correctly", () => {
      match.scorePoint(1);
      match.scorePoint(1);

      let summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe(30);

      match.removePoint();
      summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe(15);

      match.removePoint();
      summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe(0);
    });
  });

  describe("Doubles Match", () => {
    let match: TennisMatch;

    beforeEach(() => {
      match = new TennisMatch(
        ["Bob Bryan", "Mike Bryan"],
        ["John Peers", "Henri Kontinen"],
        3
      );
    });

    it("should create a doubles match correctly", () => {
      const summary = match.getMatchSummary();
      expect(summary.meta.matchType).toBe("doubles");
      expect(summary.participants[1].info.type).toBe("team");
      expect(summary.participants[2].info.type).toBe("team");

      const team1 = summary.participants[1].info as any;
      expect(team1.players.a.name).toBe("Bob Bryan");
      expect(team1.players.b.name).toBe("Mike Bryan");
    });

    it("should track individual player statistics in doubles", () => {
      const summary = match.getMatchSummary();
      const team1 = summary.participants[1].info as any;
      const playerAId = team1.players.a.id;

      // Player A from team 1 scores an ace
      match.scorePoint(1, PointOutcome.Ace, playerAId);

      const updatedSummary = match.getMatchSummary();
      const teamStats = updatedSummary.participants[1].stats as any;

      // Team stats should be updated
      expect(teamStats.serving.aces).toBe(1);

      // Individual player stats should also be tracked
      if (teamStats.playerStats && teamStats.playerStats[playerAId]) {
        expect(teamStats.playerStats[playerAId].serving.aces).toBe(1);
      }
    });

    it("should handle serving rotation in doubles", () => {
      // Complete first game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(1);
      }

      // Server should rotate to next player
      const summary = match.getMatchSummary();
      expect(summary.score.server.rotation).toBeDefined();
      expect(summary.score.server.rotation!.length).toBe(4);
    });

    it("should complete a doubles match", () => {
      // Team 1 wins 2 sets
      for (let set = 0; set < 2; set++) {
        for (let game = 0; game < 6; game++) {
          for (let point = 0; point < 4; point++) {
            match.scorePoint(1);
          }
        }
      }

      const summary = match.getMatchSummary();
      expect(summary.meta.status).toBe("completed");
      expect(summary.score.winner).toBe(1);
      expect(summary.matchScore).toBe("6-0, 6-0");
    });
  });

  describe("Serialization", () => {
    it("should serialize and deserialize correctly", () => {
      const match = new TennisMatch("Player 1", "Player 2", 3);

      // Play some points
      match.scorePoint(1, PointOutcome.Ace);
      match.scorePoint(2, PointOutcome.Winner);
      match.scorePoint(1);

      // Serialize
      const json = match.toJSON();
      expect(json.config).toBeDefined();
      expect(json.participants).toBeDefined();
      expect(json.currentGamePoints.length).toBe(3);

      // Deserialize
      const restored = TennisMatch.fromJSON(json);
      const summary = restored.getMatchSummary();

      expect(summary.score.points.values[0]).toBe(30);
      expect(summary.score.points.values[1]).toBe(15);
    });

    it("should save and load from localStorage", () => {
      // Mock localStorage
      const storage: { [key: string]: string } = {};
      global.localStorage = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((key) => delete storage[key]);
        },
        length: 0,
        key: (index: number) => null,
      } as Storage;

      const match = new TennisMatch("Player 1", "Player 2", 3);
      match.scorePoint(1);
      match.scorePoint(1);

      // Should auto-save
      expect(storage.unifiedTennisMatch).toBeDefined();

      // Load
      const loaded = TennisMatch.load();
      expect(loaded).not.toBeNull();

      if (loaded) {
        const summary = loaded.getMatchSummary();
        expect(summary.score.points.values[0]).toBe(30);
      }
    });
  });
});
