import { notFound } from "next/navigation";

import ScoreboardClient from "@/app/scoreboard-client";
import {
  LOCAL_ROOM_IDS,
  VENUE_IDS,
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

  return [...legacyRooms, ...venueRooms];
}

export default async function DisplayRoomPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const [firstSegment, secondSegment] = segments;
  const resolvedRoom =
    segments.length === 1
      ? resolveRoomId(firstSegment, "gedung-a")
      : segments.length === 2
        ? resolveRoomId(secondSegment, firstSegment)
        : null;

  if (!resolvedRoom) {
    notFound();
  }

  return <ScoreboardClient initialRoom={resolvedRoom} initialViewMode="display" />;
}
