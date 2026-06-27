import { notFound } from "next/navigation";

import ScoreboardClient from "@/app/scoreboard-client";
import {
  COMPETITIONS,
  ROOM_IDS,
  isCompetitionId,
  type RoomId,
} from "@/lib/scoreboard";

export function generateStaticParams() {
  return COMPETITIONS.flatMap((competition) =>
    ROOM_IDS.map((room) => ({ competition: competition.id, room }))
  );
}

export default async function DisplayRoomPage({
  params,
}: {
  params: Promise<{ competition: string; room: string }>;
}) {
  const { competition, room } = await params;

  if (!isCompetitionId(competition) || !ROOM_IDS.includes(room as RoomId)) {
    notFound();
  }

  return (
    <ScoreboardClient
      initialCompetition={competition}
      initialRoom={room as RoomId}
      initialViewMode="display"
    />
  );
}
