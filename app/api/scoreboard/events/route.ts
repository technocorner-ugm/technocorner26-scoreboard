import { getScoreboardStore } from "@/lib/scoreboard-store";
import {
  createCompetitionFeed,
  createRoomFeed,
  createVenueFeed,
} from "@/lib/scoreboard-feed";
import {
  isCompetitionId,
  isVenueId,
  resolveRoomId,
  type CompetitionId,
  type ScoreboardState,
} from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
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
  const selectedCompetition = isCompetitionId(competitionParam)
    ? (competitionParam as CompetitionId)
    : null;
  let unsubscribe: (() => void) | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: ScoreboardState) => {
        const eventPayload = selectedCompetition
          ? createCompetitionFeed(
              payload,
              selectedCompetition,
              selectedRoom,
              selectedVenue
            )
          : selectedRoom
            ? createRoomFeed(payload, selectedRoom)
            : selectedVenue
              ? createVenueFeed(payload, selectedVenue)
              : payload;
        controller.enqueue(
          encoder.encode(`event: scoreboard\ndata: ${JSON.stringify(eventPayload)}\n\n`)
        );
      };

      unsubscribe = getScoreboardStore().subscribe(send);
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);
    },
    cancel() {
      if (keepAlive) {
        clearInterval(keepAlive);
      }
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Access-Control-Allow-Origin": "*",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
