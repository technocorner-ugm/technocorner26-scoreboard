import { notFound } from "next/navigation";

import ScoreboardClient from "@/app/scoreboard-client";
import { ROOM_IDS, type RoomId } from "@/lib/scoreboard";

export function generateStaticParams() {
  return ROOM_IDS.map((room) => ({ room }));
}

export default async function DisplayRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;

  if (!ROOM_IDS.includes(room as RoomId)) {
    notFound();
  }

  return <ScoreboardClient initialRoom={room as RoomId} initialViewMode="display" />;
}
