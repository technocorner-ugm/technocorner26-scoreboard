import { getScoreboardStore } from "@/lib/scoreboard-store";
import { createCompetitionFeed } from "@/lib/scoreboard-feed";
import {
  ROOM_IDS,
  isCompetitionId,
  type CompetitionId,
  type RoomId,
  type ScoreboardState,
} from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const roomParam = new URL(request.url).searchParams.get("room");
  const selectedRoom = ROOM_IDS.includes(roomParam as RoomId)
    ? (roomParam as RoomId)
    : null;
  const competitionParam = new URL(request.url).searchParams.get("competition");
  const selectedCompetition = isCompetitionId(competitionParam)
    ? (competitionParam as CompetitionId)
    : null;
  let unsubscribe: (() => void) | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: ScoreboardState) => {
        const eventPayload = selectedCompetition
          ? createCompetitionFeed(payload, selectedCompetition, selectedRoom)
          : selectedRoom
            ? payload.rooms[selectedRoom]
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
