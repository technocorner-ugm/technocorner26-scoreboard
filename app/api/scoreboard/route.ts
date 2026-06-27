import { getScoreboardStore } from "@/lib/scoreboard-store";
import { createCompetitionFeed, createVenueFeed } from "@/lib/scoreboard-feed";
import {
  isCompetitionId,
  isVenueId,
  resolveRoomId,
  type RoomTarget,
  type ScoreboardPatch,
} from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const snapshot = getScoreboardStore().getSnapshot();
  const searchParams = new URL(request.url).searchParams;
  const roomParam = searchParams.get("room");
  const venueParam = searchParams.get("venue");
  const selectedRoom = resolveRoomId(roomParam, venueParam);
  const selectedVenue = isVenueId(venueParam)
    ? venueParam
    : isVenueId(roomParam)
      ? roomParam
      : null;
  const competitionParam = searchParams.get("competition");
  const payload = isCompetitionId(competitionParam)
    ? createCompetitionFeed(snapshot, competitionParam, selectedRoom, selectedVenue)
    : selectedRoom
      ? snapshot.rooms[selectedRoom]
      : selectedVenue
        ? createVenueFeed(snapshot, selectedVenue)
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
  const roomParam = searchParams.get("room");
  const venueParam = searchParams.get("venue");
  const target = (resolveRoomId(roomParam, venueParam) ??
    (isVenueId(roomParam) ? roomParam : null) ??
    (isVenueId(venueParam) ? venueParam : "all")) as RoomTarget;

  return Response.json(getScoreboardStore().reset(target));
}
