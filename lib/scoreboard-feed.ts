import {
  ROOM_IDS,
  type CompetitionId,
  type RoomId,
  type RoomState,
  type ScoreboardState,
} from "./scoreboard";

export type CompetitionFeed = {
  competition: CompetitionId;
  rooms: Partial<Record<RoomId, RoomState>>;
  version: number;
  updatedAt: number;
};

export function createCompetitionFeed(
  snapshot: ScoreboardState,
  competition: CompetitionId,
  selectedRoom: RoomId | null = null
): CompetitionFeed {
  const roomIds: readonly RoomId[] = selectedRoom ? [selectedRoom] : ROOM_IDS;
  const rooms = roomIds.reduce(
    (matchingRooms, roomId) => {
      const room = snapshot.rooms[roomId];

      if (room.competition === competition) {
        matchingRooms[roomId] = room;
      }

      return matchingRooms;
    },
    {} as Partial<Record<RoomId, RoomState>>
  );

  return {
    competition,
    rooms,
    version: snapshot.version,
    updatedAt: snapshot.updatedAt,
  };
}
