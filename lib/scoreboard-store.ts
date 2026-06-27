import {
  COMPETITION_IDS,
  ROOM_IDS,
  getVenueRoomIds,
  isVenueId,
  type CompetitionId,
  type CompetitionRooms,
  type RoomId,
  type RoomState,
  type RoomTarget,
  type ScoreboardPatch,
  type ScoreboardState,
  type TimerAction,
  type TimerCommand,
  type TimerTarget,
  applyTimerAction,
  cloneRoom,
  createCompetitionRooms,
  createRoomState,
  createTimer,
  createScoreboardState,
  normalizeTimer,
  sanitizeRoomState,
} from "./scoreboard";

type Subscriber = (state: ScoreboardState) => void;

class ScoreboardStore {
  private state: ScoreboardState = createScoreboardState();
  private subscribers = new Set<Subscriber>();

  getSnapshot() {
    const now = Date.now();
    const competitions = COMPETITION_IDS.reduce(
      (allCompetitions, competitionId) => {
        const rooms = ROOM_IDS.reduce(
          (nextRooms, roomId) => {
            const source = this.state.competitions?.[competitionId]?.[roomId];
            const room = sanitizeRoomState(
              source
                ? { ...source, competition: competitionId }
                : createRoomState(competitionId, roomId),
              roomId
            );

            nextRooms[roomId] = {
              ...room,
              timer: normalizeTimer(room.timer, now),
              timeouts: [
                normalizeTimer(room.timeouts?.[0] ?? createTimer(0), now),
                normalizeTimer(room.timeouts?.[1] ?? createTimer(0), now),
              ],
            };

            return nextRooms;
          },
          {} as CompetitionRooms
        );

        allCompetitions[competitionId] = rooms;
        return allCompetitions;
      },
      {} as Record<CompetitionId, CompetitionRooms>
    );

    this.state = {
      ...this.state,
      competitions,
      updatedAt: now,
    };

    return this.state;
  }

  patch(payload: ScoreboardPatch) {
    const nextState = this.getSnapshot();
    const competitionRooms = nextState.competitions[payload.competition];
    const targets = getTargetRoomIds(payload.room);

    targets.forEach((roomId) => {
      competitionRooms[roomId] = sanitizeRoomState(
        { ...cloneRoom(payload.state, roomId), competition: payload.competition },
        roomId,
        { incoming: true }
      );
    });

    this.state = {
      competitions: nextState.competitions,
      version: nextState.version + 1,
      updatedAt: Date.now(),
    };

    this.broadcast();
    return this.state;
  }

  commandTimer(command: TimerCommand) {
    const state = this.getSnapshot();
    const competitionRooms = state.competitions[command.competition];
    const targets = getTargetRoomIds(command.room);

    targets.forEach((roomId) => {
      const room = cloneRoom(competitionRooms[roomId], roomId);
      applyTimerCommand(room, command.target, command.action);
      competitionRooms[roomId] = sanitizeRoomState(room, roomId, { incoming: true });
    });

    this.state = {
      competitions: state.competitions,
      version: state.version + 1,
      updatedAt: Date.now(),
    };

    this.broadcast();
    return this.state;
  }

  reset(competition: CompetitionId, target: RoomTarget) {
    const state = this.getSnapshot();
    const competitionRooms = state.competitions[competition];
    const fresh = createCompetitionRooms(competition);
    const targets = getTargetRoomIds(target);

    targets.forEach((roomId) => {
      competitionRooms[roomId] = fresh[roomId];
    });

    this.state = {
      competitions: state.competitions,
      version: state.version + 1,
      updatedAt: Date.now(),
    };

    this.broadcast();
    return this.state;
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    subscriber(this.getSnapshot());

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private broadcast() {
    const snapshot = this.getSnapshot();
    this.subscribers.forEach((subscriber) => subscriber(snapshot));
  }
}

function applyTimerCommand(room: RoomState, target: TimerTarget, action: TimerAction) {
  if (target === "main") {
    room.timer = applyTimerAction(room.timer, action);
    return;
  }

  const timeoutIndex = target === "timeout-0" ? 0 : 1;

  if (action === "start") {
    room.timer = applyTimerAction(room.timer, "pause");
  }

  room.timeouts[timeoutIndex] = applyTimerAction(room.timeouts[timeoutIndex], action);
}

function getTargetRoomIds(target: RoomTarget): readonly RoomId[] {
  if (target === "all") {
    return ROOM_IDS;
  }

  if (isVenueId(target)) {
    return getVenueRoomIds(target);
  }

  return [target];
}

declare global {
  var __tcScoreboardStore: ScoreboardStore | undefined;
}

export function getScoreboardStore() {
  globalThis.__tcScoreboardStore ??= new ScoreboardStore();
  return globalThis.__tcScoreboardStore;
}
