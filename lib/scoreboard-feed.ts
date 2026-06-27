import {
  COMPETITION_IDS,
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
  competitions: Record<
    CompetitionId,
    Partial<Record<RoomId, RoomState>>
  >;
  version: number;
  updatedAt: number;
};

export type RoomFeed = {
  room: RoomId;
  competitions: Record<CompetitionId, RoomState>;
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
  const competitionRooms = snapshot.competitions[competition] ?? {};
  const rooms = roomIds.reduce(
    (matchingRooms, roomId) => {
      const room = competitionRooms[roomId];

      if (room) {
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

export function createRoomFeed(snapshot: ScoreboardState, room: RoomId): RoomFeed {
  const competitions = COMPETITION_IDS.reduce(
    (matchingCompetitions, competitionId) => {
      matchingCompetitions[competitionId] = snapshot.competitions[competitionId][room];
      return matchingCompetitions;
    },
    {} as Record<CompetitionId, RoomState>
  );

  return {
    room,
    competitions,
    version: snapshot.version,
    updatedAt: snapshot.updatedAt,
  };
}

export function createVenueFeed(snapshot: ScoreboardState, venue: VenueId): VenueFeed {
  const competitions = COMPETITION_IDS.reduce(
    (venueCompetitions, competitionId) => {
      venueCompetitions[competitionId] = ROOM_IDS.reduce(
        (venueRooms, roomId) => {
          if (ROOM_VENUES[roomId] === venue) {
            venueRooms[roomId] = snapshot.competitions[competitionId][roomId];
          }

          return venueRooms;
        },
        {} as Partial<Record<RoomId, RoomState>>
      );
      return venueCompetitions;
    },
    {} as Record<CompetitionId, Partial<Record<RoomId, RoomState>>>
  );

  return {
    venue,
    competitions,
    version: snapshot.version,
    updatedAt: snapshot.updatedAt,
  };
}
