import { getScoreboardStore } from "@/lib/scoreboard-store";
import { createCompetitionFeed } from "@/lib/scoreboard-feed";
import {
  isCompetitionId,
  isVenueId,
  resolveRoomId,
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

  const searchParams = new URL(request.url).searchParams;
  const roomParam = searchParams.get("room");
  const venueParam = searchParams.get("venue");
  const selectedRoom = resolveRoomId(roomParam, venueParam);
  const selectedVenue = isVenueId(venueParam)
    ? venueParam
    : isVenueId(roomParam)
      ? roomParam
      : null;
  const payload = createCompetitionFeed(
    getScoreboardStore().getSnapshot(),
    competition,
    selectedRoom,
    selectedVenue
  );

  return Response.json(payload, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
