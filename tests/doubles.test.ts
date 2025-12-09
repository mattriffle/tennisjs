import { TennisMatch, PointOutcome } from "../src";

describe("Doubles Match Tests", () => {
  describe("Match Initialization", () => {
    it("should create a doubles match with correct team structure", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const summary = match.getMatchSummary();
      expect(summary.meta.matchType).toBe("doubles");
      expect(summary.participants[1].info.type).toBe("team");
      expect(summary.participants[2].info.type).toBe("team");
    });

    it("should initialize serving rotation correctly", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const summary = match.getMatchSummary();
      expect(summary.score.server.rotation).toBeDefined();
      expect(summary.score.server.rotation!.length).toBe(4);
    });

    it("should set first server as Team 1 Player A by default", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const summary = match.getMatchSummary();
      const currentServerId = summary.score.server.current;
      const rotation = summary.score.server.rotation!;
      expect(currentServerId).toBe(rotation[0]);
    });
  });

  describe("Serving Rotation", () => {
    const winGame = (match: TennisMatch, team: 1 | 2) => {
      for (let i = 0; i < 4; i++) {
        match.scorePoint(team);
      }
    };

    it("should follow correct serving order: T1A → T2A → T1B → T2B", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const rotation = match.getMatchSummary().score.server.rotation!;

      // First game - first in rotation serves
      let serverId = match.getMatchSummary().score.server.current;
      expect(serverId).toBe(rotation[0]);
      winGame(match, 1);

      // Second game - second in rotation serves
      serverId = match.getMatchSummary().score.server.current;
      expect(serverId).toBe(rotation[1]);
      winGame(match, 2);

      // Third game - third in rotation serves
      serverId = match.getMatchSummary().score.server.current;
      expect(serverId).toBe(rotation[2]);
      winGame(match, 1);

      // Fourth game - fourth in rotation serves
      serverId = match.getMatchSummary().score.server.current;
      expect(serverId).toBe(rotation[3]);
      winGame(match, 2);

      // Fifth game - back to first
      serverId = match.getMatchSummary().score.server.current;
      expect(serverId).toBe(rotation[0]);
    });

    it("should maintain server throughout entire game", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const initialServerId = match.getMatchSummary().score.server.current;

      match.scorePoint(1); // 15-0
      expect(match.getMatchSummary().score.server.current).toBe(
        initialServerId
      );

      match.scorePoint(2); // 15-15
      expect(match.getMatchSummary().score.server.current).toBe(
        initialServerId
      );

      match.scorePoint(1); // 30-15
      expect(match.getMatchSummary().score.server.current).toBe(
        initialServerId
      );

      match.scorePoint(1); // 40-15
      expect(match.getMatchSummary().score.server.current).toBe(
        initialServerId
      );

      match.scorePoint(1); // Game won

      // Server should change after game
      expect(match.getMatchSummary().score.server.current).not.toBe(
        initialServerId
      );
    });
  });

  describe("Tiebreak Serving", () => {
    const setupTiebreak = (match: TennisMatch) => {
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
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      setupTiebreak(match);

      const firstServerId = match.getMatchSummary().score.server.current;

      // Score first point
      match.scorePoint(1);

      // Server should change after first point
      expect(match.getMatchSummary().score.server.current).not.toBe(
        firstServerId
      );
    });

    it("should change server every 2 points after first point", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      setupTiebreak(match);

      // First point
      match.scorePoint(1);
      const server1 = match.getMatchSummary().score.server.current;

      // Second point - same server
      match.scorePoint(1);
      expect(match.getMatchSummary().score.server.current).toBe(server1);

      // Third point - server changes
      match.scorePoint(2);
      const server3 = match.getMatchSummary().score.server.current;
      expect(server3).not.toBe(server1);

      // Fourth point - same server
      match.scorePoint(2);
      expect(match.getMatchSummary().score.server.current).toBe(server3);

      // Fifth point - server changes
      match.scorePoint(1);
      expect(match.getMatchSummary().score.server.current).not.toBe(server3);
    });
  });

  describe("Individual Player Statistics", () => {
    it("should track points won by team", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      // Get player IDs
      const summary = match.getMatchSummary();
      const team1 = summary.participants[1].info as any;
      const scorerId = team1.players.a.id;

      // Score points with player attribution
      match.scorePoint(1, PointOutcome.Ace, scorerId);
      match.scorePoint(1, PointOutcome.Winner, scorerId);
      match.scorePoint(2, PointOutcome.ReturnWinner);

      const updatedSummary = match.getMatchSummary();
      const team1Stats = updatedSummary.participants[1].stats;
      expect(team1Stats.serving.aces).toBe(1);
      expect(team1Stats.rally.winners).toBe(1);
    });

    it("should track aces for serving team", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const summary = match.getMatchSummary();
      const team1 = summary.participants[1].info as any;
      const scorerId = team1.players.a.id;

      match.scorePoint(1, PointOutcome.Ace, scorerId);
      match.scorePoint(1, PointOutcome.Ace, scorerId);

      const updatedSummary = match.getMatchSummary();
      expect(updatedSummary.participants[1].stats.serving.aces).toBe(2);
    });
  });

  describe("Score Tracking", () => {
    it("should track team scores correctly", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      // Team 1 wins first game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(1);
      }

      let summary = match.getMatchSummary();
      expect(summary.score.games[0]).toBe(1);
      expect(summary.score.games[1]).toBe(0);

      // Team 2 wins second game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(2);
      }

      summary = match.getMatchSummary();
      expect(summary.score.games[0]).toBe(1);
      expect(summary.score.games[1]).toBe(1);
    });

    it("should handle deuce and advantage in doubles", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      // Get to deuce
      match.scorePoint(1); // 15-0
      match.scorePoint(1); // 30-0
      match.scorePoint(1); // 40-0
      match.scorePoint(2); // 40-15
      match.scorePoint(2); // 40-30
      match.scorePoint(2); // Deuce

      let summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe("DEUCE");
      expect(summary.score.points.values[1]).toBe("DEUCE");

      // Advantage Team 1
      match.scorePoint(1);
      summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe("AD IN");

      // Back to deuce
      match.scorePoint(2);
      summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe("DEUCE");
      expect(summary.score.points.values[1]).toBe("DEUCE");
    });
  });

  describe("Match Summary", () => {
    it("should return correct doubles format for getMatchSummary", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const summary = match.getMatchSummary();

      expect(summary.meta.matchType).toBe("doubles");
      expect(summary.score.server.rotation).toBeDefined();
      expect(summary.score.server.current).toBeDefined();
      expect(summary.participants[1]).toBeDefined();
      expect(summary.participants[2]).toBeDefined();
    });

    it("should include participant info in summary", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const summary = match.getMatchSummary();

      expect(summary.participants[1].info.type).toBe("team");
      expect(summary.participants[2].info.type).toBe("team");
    });
  });

  describe("Undo/Redo Operations", () => {
    it("should undo last point and maintain server", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      const initialServerId = match.getMatchSummary().score.server.current;

      match.scorePoint(1);
      match.scorePoint(1);

      let summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe(30);

      match.removePoint();

      summary = match.getMatchSummary();
      expect(summary.score.points.values[0]).toBe(15);

      expect(match.getMatchSummary().score.server.current).toBe(
        initialServerId
      );
    });

    it("should undo across game boundaries correctly", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      // Win first game
      for (let i = 0; i < 4; i++) {
        match.scorePoint(1);
      }

      let summary = match.getMatchSummary();
      expect(summary.score.games[0]).toBe(1);

      // Undo the game-winning point
      match.removePoint();

      summary = match.getMatchSummary();
      expect(summary.score.games[0]).toBe(0);
      expect(summary.score.points.values[0]).toBe(40);
    });
  });

  describe("Save and Load", () => {
    it("should save doubles match state completely", () => {
      let savedState: string | null = null;

      const customSaver = (matchToSave: TennisMatch) => {
        savedState = JSON.stringify(matchToSave.toJSON());
      };

      const match = new TennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3,
        customSaver
      );

      match.scorePoint(1);
      match.scorePoint(2);

      expect(savedState).not.toBeNull();
      const parsed = JSON.parse(savedState!);
      expect(parsed.config.matchType).toBe("doubles");
    });

    it("should load doubles match with all data", () => {
      let savedState: string | null = null;

      const customSaver = (matchToSave: TennisMatch) => {
        savedState = JSON.stringify(matchToSave.toJSON());
      };

      const customLoader = () => (savedState ? JSON.parse(savedState) : null);

      const originalMatch = new TennisMatch(
        ["Alice", "Bob"],
        ["Charlie", "Diana"],
        3,
        customSaver
      );

      const summary = originalMatch.getMatchSummary();
      const team1 = summary.participants[1].info as any;
      const scorerId = team1.players.a.id;

      originalMatch.scorePoint(1, PointOutcome.Ace, scorerId);
      originalMatch.scorePoint(1, PointOutcome.Winner, scorerId);

      const originalSummary = originalMatch.getMatchSummary();

      // Load the match
      const loadedData = customLoader();
      const loadedMatch = TennisMatch.fromJSON(loadedData, customSaver);

      const loadedSummary = loadedMatch.getMatchSummary();

      // Verify the state matches
      expect(loadedSummary.meta.matchType).toBe("doubles");
      expect(loadedSummary.score.points.values).toEqual(
        originalSummary.score.points.values
      );
    });
  });

  describe("Singles Support", () => {
    it("should still support singles matches", () => {
      const match = new TennisMatch("Alice", "Bob", 3);

      const summary = match.getMatchSummary();
      expect(summary.meta.matchType).toBe("singles");
      expect(summary.participants[1].info.type).toBe("player");

      match.scorePoint(1, PointOutcome.Ace);

      const updatedSummary = match.getMatchSummary();
      expect(updatedSummary.participants[1].stats.serving.aces).toBe(1);
    });
  });

  describe("getScore method", () => {
    it("should return score data for doubles", () => {
      const match = new TennisMatch(["Alice", "Bob"], ["Charlie", "Diana"], 3);

      match.scorePoint(1);
      match.scorePoint(1);

      const summary = match.getMatchSummary();

      expect(summary.meta.matchType).toBe("doubles");
      expect(summary.score.points.values[0]).toBe(30);
      expect(summary.score.points.values[1]).toBe(0);
    });
  });
});
