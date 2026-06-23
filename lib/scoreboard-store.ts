import {
  ROOM_IDS,
  type RoomId,
  type RoomTarget,
  type ScoreboardPatch,
  type ScoreboardState,
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
    };

    return this.state;
  }

  patch(payload: ScoreboardPatch) {
    const nextState = this.getSnapshot();

    if (payload.room === "all") {
      ROOM_IDS.forEach((roomId) => {
        nextState.rooms[roomId] = sanitizeRoomState(cloneRoom(payload.state, roomId), roomId);
      });
    } else {
      nextState.rooms[payload.room] = sanitizeRoomState(
        cloneRoom(payload.state, payload.room),
        payload.room
      );
    }

    this.state = {
      rooms: nextState.rooms,
      version: nextState.version + 1,
      updatedAt: Date.now(),
    };

    this.broadcast();
    return this.state;
  }

  reset(target: RoomTarget) {
    const state = this.getSnapshot();

    if (target === "all") {
      ROOM_IDS.forEach((roomId) => {
        state.rooms[roomId] = createScoreboardState().rooms[roomId];
      });
    } else {
      state.rooms[target] = createScoreboardState().rooms[target as RoomId];
    }

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

declare global {
  var __tcScoreboardStore: ScoreboardStore | undefined;
}

export function getScoreboardStore() {
  globalThis.__tcScoreboardStore ??= new ScoreboardStore();
  return globalThis.__tcScoreboardStore;
}
