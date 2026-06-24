import { getScoreboardStore } from "@/lib/scoreboard-store";
import { createCompetitionFeed } from "@/lib/scoreboard-feed";
import {
  ROOM_IDS,
  isCompetitionId,
  type RoomId,
  type RoomTarget,
  type ScoreboardPatch,
} from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const snapshot = getScoreboardStore().getSnapshot();
  const searchParams = new URL(request.url).searchParams;
  const roomParam = searchParams.get("room");
  const selectedRoom = ROOM_IDS.includes(roomParam as RoomId) ? (roomParam as RoomId) : null;
  const competitionParam = searchParams.get("competition");
  const payload = isCompetitionId(competitionParam)
    ? createCompetitionFeed(snapshot, competitionParam, selectedRoom)
    : selectedRoom
      ? snapshot.rooms[selectedRoom]
      : snapshot;

  return Response.json(payload, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as ScoreboardPatch;

  if (!payload?.room || !payload?.state) {
    return Response.json({ message: "Invalid scoreboard payload" }, { status: 400 });
  }

  return Response.json(getScoreboardStore().patch(payload));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = (searchParams.get("room") ?? "all") as RoomTarget;

  return Response.json(getScoreboardStore().reset(target));
}
