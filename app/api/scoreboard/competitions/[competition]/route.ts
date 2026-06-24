import { getScoreboardStore } from "@/lib/scoreboard-store";
import { createCompetitionFeed } from "@/lib/scoreboard-feed";
import {
  ROOM_IDS,
  isCompetitionId,
  type RoomId,
} from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ competition: string }> }
) {
  const { competition } = await params;

  if (!isCompetitionId(competition)) {
    return Response.json(
      { message: "Competition not found" },
      {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  const roomParam = new URL(request.url).searchParams.get("room");
  const selectedRoom = ROOM_IDS.includes(roomParam as RoomId) ? (roomParam as RoomId) : null;
  const payload = createCompetitionFeed(
    getScoreboardStore().getSnapshot(),
    competition,
    selectedRoom
  );

  return Response.json(payload, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
