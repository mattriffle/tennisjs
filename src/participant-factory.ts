/**
 * Factory functions for creating and managing match participants.
 */

import {
  AnyParticipant,
  SinglesPlayer,
  DoublesTeam,
  TeamPlayer,
  SinglesPlayerConfig,
  DoublesTeamConfig,
  ParticipantPosition,
  ParticipantFactory,
  TeamPlayerPosition,
} from "./unified-types.js";

/**
 * Generates a unique ID for a participant.
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Creates a singles player participant.
 */
export function createSinglesPlayer(
  config: SinglesPlayerConfig,
  position: ParticipantPosition
): SinglesPlayer {
  return {
    id: config.id || generateId("player"),
    type: "player",
    name: config.name,
    position,
  };
}

/**
 * Creates a team player.
 */
function createTeamPlayer(
  config: SinglesPlayerConfig,
  position: TeamPlayerPosition
): TeamPlayer {
  return {
    id: config.id || generateId("teamplayer"),
    name: config.name,
    position,
  };
}

/**
 * Creates a doubles team participant.
 */
export function createDoublesTeam(
  config: DoublesTeamConfig,
  position: ParticipantPosition
): DoublesTeam {
  const teamName =
    config.name || `${config.players.a.name}/${config.players.b.name}`;

  return {
    id: config.id || generateId("team"),
    type: "team",
    name: teamName,
    position,
    players: {
      a: createTeamPlayer(config.players.a, "a"),
      b: createTeamPlayer(config.players.b, "b"),
    },
  };
}

/**
 * Creates a participant from legacy data format.
 */
export function createFromLegacy(
  data: any,
  position: ParticipantPosition
): AnyParticipant {
  // Handle singles player
  if (typeof data === "string") {
    return createSinglesPlayer({ name: data }, position);
  }

  // Handle doubles team (array of names)
  if (Array.isArray(data) && data.length === 2) {
    return createDoublesTeam(
      {
        players: {
          a: { name: data[0] },
          b: { name: data[1] },
        },
      },
      position
    );
  }

  // Handle legacy player object
  if (data.name && !data.players) {
    return createSinglesPlayer(
      {
        name: data.name,
        id: data.id,
      },
      position
    );
  }

  // Handle legacy team object
  if (data.players && Array.isArray(data.players)) {
    return createDoublesTeam(
      {
        name: data.name,
        id: data.id,
        players: {
          a: {
            name: data.players[0].name || data.players[0],
            id: data.players[0].id,
          },
          b: {
            name: data.players[1].name || data.players[1],
            id: data.players[1].id,
          },
        },
      },
      position
    );
  }

  throw new Error(
    `Unable to create participant from legacy data: ${JSON.stringify(data)}`
  );
}

/**
 * Gets all player IDs from a participant.
 */
export function getPlayerIds(participant: AnyParticipant): string[] {
  if (participant.type === "player") {
    return [participant.id];
  }

  return [participant.players.a.id, participant.players.b.id];
}

/**
 * Gets a specific player from a participant.
 */
export function getPlayer(
  participant: AnyParticipant,
  position?: TeamPlayerPosition
): { id: string; name: string } | null {
  if (participant.type === "player") {
    return { id: participant.id, name: participant.name };
  }

  if (!position) {
    return null;
  }

  return participant.players[position];
}

/**
 * Gets the display name for a participant.
 */
export function getDisplayName(participant: AnyParticipant): string {
  return participant.name;
}

/**
 * Gets the abbreviated name for a participant.
 */
export function getAbbreviatedName(participant: AnyParticipant): string {
  if (participant.type === "player") {
    // Return last name or initials
    const parts = participant.name.split(" ");
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    return participant.name.substring(0, 3).toUpperCase();
  }

  // For teams, use initials
  const playerA = participant.players.a.name
    .split(" ")
    .map((p) => p[0])
    .join("");
  const playerB = participant.players.b.name
    .split(" ")
    .map((p) => p[0])
    .join("");
  return `${playerA}/${playerB}`;
}

/**
 * Determines if two participants are equal.
 */
export function areParticipantsEqual(
  a: AnyParticipant,
  b: AnyParticipant
): boolean {
  return a.id === b.id;
}

/**
 * Creates a serving rotation for doubles.
 */
export function createServingRotation(
  team1: DoublesTeam,
  team2: DoublesTeam,
  firstServer: { team: ParticipantPosition; player: TeamPlayerPosition }
): string[] {
  const rotation: string[] = [];

  // Standard rotation: T1A → T2A → T1B → T2B (or variations based on first server)
  const teams = { 1: team1, 2: team2 };
  const positions: TeamPlayerPosition[] = ["a", "b"];

  // Start with the specified first server
  let currentTeam = firstServer.team;
  let currentPosition = firstServer.player;

  for (let i = 0; i < 4; i++) {
    rotation.push(teams[currentTeam].players[currentPosition].id);

    // Alternate teams
    currentTeam = currentTeam === 1 ? 2 : 1;

    // After both teams have served with position 'a', switch to position 'b'
    if (i === 1) {
      currentPosition = currentPosition === "a" ? "b" : "a";
    }
  }

  return rotation;
}

/**
 * Gets the next server in a rotation.
 */
export function getNextServer(
  rotation: string[],
  currentServerId: string
): string {
  const currentIndex = rotation.indexOf(currentServerId);
  if (currentIndex === -1) {
    throw new Error(`Server ${currentServerId} not found in rotation`);
  }

  const nextIndex = (currentIndex + 1) % rotation.length;
  return rotation[nextIndex];
}

/**
 * Validates participant configuration.
 */
export function validateParticipantConfig(
  config: SinglesPlayerConfig | DoublesTeamConfig
): void {
  if ("players" in config) {
    // Doubles team validation
    if (!config.players.a || !config.players.b) {
      throw new Error("Doubles team must have two players");
    }
    if (!config.players.a.name || !config.players.b.name) {
      throw new Error("All players must have names");
    }
  } else {
    // Singles player validation
    if (!config.name) {
      throw new Error("Player must have a name");
    }
  }
}

/**
 * Complete participant factory implementation.
 */
export const participantFactory: ParticipantFactory = {
  createSinglesPlayer,
  createDoublesTeam,
  createFromLegacy: (data: any) => {
    // Attempt to determine position from data
    const position = data.position || 1;
    return createFromLegacy(data, position as ParticipantPosition);
  },
};

/**
 * Helper to create participants for a match.
 */
export function createMatchParticipants(
  participant1:
    | string
    | [string, string]
    | SinglesPlayerConfig
    | DoublesTeamConfig,
  participant2:
    | string
    | [string, string]
    | SinglesPlayerConfig
    | DoublesTeamConfig
): { 1: AnyParticipant; 2: AnyParticipant } {
  const participants: { 1: AnyParticipant; 2: AnyParticipant } = {} as any;

  // Handle participant 1
  if (typeof participant1 === "string") {
    participants[1] = createSinglesPlayer({ name: participant1 }, 1);
  } else if (Array.isArray(participant1)) {
    participants[1] = createDoublesTeam(
      {
        players: {
          a: { name: participant1[0] },
          b: { name: participant1[1] },
        },
      },
      1
    );
  } else if ("players" in participant1) {
    participants[1] = createDoublesTeam(participant1 as DoublesTeamConfig, 1);
  } else {
    participants[1] = createSinglesPlayer(
      participant1 as SinglesPlayerConfig,
      1
    );
  }

  // Handle participant 2
  if (typeof participant2 === "string") {
    participants[2] = createSinglesPlayer({ name: participant2 }, 2);
  } else if (Array.isArray(participant2)) {
    participants[2] = createDoublesTeam(
      {
        players: {
          a: { name: participant2[0] },
          b: { name: participant2[1] },
        },
      },
      2
    );
  } else if ("players" in participant2) {
    participants[2] = createDoublesTeam(participant2 as DoublesTeamConfig, 2);
  } else {
    participants[2] = createSinglesPlayer(
      participant2 as SinglesPlayerConfig,
      2
    );
  }

  // Validate match type consistency
  if (participants[1].type !== participants[2].type) {
    throw new Error(
      "Both participants must be of the same type (singles or doubles)"
    );
  }

  return participants;
}
