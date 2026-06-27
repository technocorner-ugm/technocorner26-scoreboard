import {
  ROOM_IDS,
  getVenueRoomIds,
  isVenueId,
  type RoomId,
  type RoomTarget,
  type RoomState,
  type ScoreboardPatch,
  type ScoreboardState,
  type TimerAction,
  type TimerCommand,
  type TimerTarget,
  applyTimerAction,
  cloneRoom,
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
    const rooms = ROOM_IDS.reduce(
      (next, roomId) => {
        const room = sanitizeRoomState(
          this.state.rooms[roomId] ?? createScoreboardState().rooms[roomId],
          roomId
        );

        return {
          ...next,
          [roomId]: {
            ...room,
            timer: normalizeTimer(room.timer, now),
            timeouts: [
              normalizeTimer(room.timeouts?.[0] ?? createTimer(0), now),
              normalizeTimer(room.timeouts?.[1] ?? createTimer(0), now),
            ],
          },
        };
      },
      {} as ScoreboardState["rooms"]
    );

    this.state = {
      ...this.state,
      rooms,
      updatedAt: now,
    };

    return this.state;
  }

  patch(payload: ScoreboardPatch) {
    const nextState = this.getSnapshot();
    const targets = getTargetRoomIds(payload.room);

    targets.forEach((roomId) => {
      nextState.rooms[roomId] = sanitizeRoomState(cloneRoom(payload.state, roomId), roomId, {
        incoming: true,
      });
    });

    this.state = {
      rooms: nextState.rooms,
      version: nextState.version + 1,
      updatedAt: Date.now(),
    };

    this.broadcast();
    return this.state;
  }

  commandTimer(command: TimerCommand) {
    const state = this.getSnapshot();
    const targets = getTargetRoomIds(command.room);

    targets.forEach((roomId) => {
      const room = cloneRoom(state.rooms[roomId], roomId);
      applyTimerCommand(room, command.target, command.action);
      state.rooms[roomId] = sanitizeRoomState(room, roomId, { incoming: true });
    });

    this.state = {
      rooms: state.rooms,
      version: state.version + 1,
      updatedAt: Date.now(),
    };

    this.broadcast();
    return this.state;
  }

  reset(target: RoomTarget) {
    const state = this.getSnapshot();
    const targets = getTargetRoomIds(target);

    targets.forEach((roomId) => {
      state.rooms[roomId] = createScoreboardState().rooms[roomId];
    });

    this.state = {
      rooms: state.rooms,
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
