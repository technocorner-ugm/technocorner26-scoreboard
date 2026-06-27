import { notFound } from "next/navigation";

import ScoreboardClient from "@/app/scoreboard-client";
import {
  COMPETITIONS,
  LOCAL_ROOM_IDS,
  VENUE_IDS,
  isCompetitionId,
  resolveRoomId,
} from "@/lib/scoreboard";

export function generateStaticParams() {
  const legacyRooms = LOCAL_ROOM_IDS.map((room) => ({
    segments: [room],
  }));
  const venueRooms = VENUE_IDS.flatMap((venue) =>
    LOCAL_ROOM_IDS.map((room) => ({
      segments: [venue, room],
    }))
  );
  const competitionVenueRooms = COMPETITIONS.flatMap((competition) =>
    VENUE_IDS.flatMap((venue) =>
      LOCAL_ROOM_IDS.map((room) => ({
        segments: [competition.id, venue, room],
      }))
    )
  );

  return [...legacyRooms, ...venueRooms, ...competitionVenueRooms];
}

export default async function DisplayRoomPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const [firstSegment, secondSegment, thirdSegment] = segments;
  const initialCompetition = isCompetitionId(firstSegment)
    ? firstSegment
    : COMPETITIONS[0].id;
  let resolvedRoom = null;

  if (segments.length === 1) {
    resolvedRoom = resolveRoomId(firstSegment, "gedung-a");
  } else if (segments.length === 2) {
    resolvedRoom = isCompetitionId(firstSegment)
      ? resolveRoomId(secondSegment, "gedung-a")
      : resolveRoomId(secondSegment, firstSegment);
  } else if (segments.length === 3 && isCompetitionId(firstSegment)) {
    resolvedRoom = resolveRoomId(thirdSegment, secondSegment);
  }

  if (!resolvedRoom) {
    notFound();
  }

  return (
    <ScoreboardClient
      initialCompetition={initialCompetition}
      initialRoom={resolvedRoom}
      initialViewMode="display"
    />
  );
}
