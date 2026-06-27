import {
  ROOM_IDS,
  ROOM_VENUES,
  type CompetitionId,
  type RoomId,
  type RoomState,
  type ScoreboardState,
  type VenueId,
} from "./scoreboard";

export type CompetitionFeed = {
  competition: CompetitionId;
  rooms: Partial<Record<RoomId, RoomState>>;
  version: number;
  updatedAt: number;
};

export type VenueFeed = {
  venue: VenueId;
  rooms: Partial<Record<RoomId, RoomState>>;
  version: number;
  updatedAt: number;
};

export function createCompetitionFeed(
  snapshot: ScoreboardState,
  competition: CompetitionId,
  selectedRoom: RoomId | null = null,
  selectedVenue: VenueId | null = null
): CompetitionFeed {
  const roomIds: readonly RoomId[] = selectedRoom
    ? [selectedRoom]
    : selectedVenue
      ? ROOM_IDS.filter((roomId) => ROOM_VENUES[roomId] === selectedVenue)
      : ROOM_IDS;
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

export function createVenueFeed(snapshot: ScoreboardState, venue: VenueId): VenueFeed {
  const rooms = ROOM_IDS.reduce(
    (venueRooms, roomId) => {
      if (ROOM_VENUES[roomId] === venue) {
        venueRooms[roomId] = snapshot.rooms[roomId];
      }

      return venueRooms;
    },
    {} as Partial<Record<RoomId, RoomState>>
  );

  return {
    venue,
    rooms,
    version: snapshot.version,
    updatedAt: snapshot.updatedAt,
  };
}
