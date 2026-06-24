export const ROOM_IDS = ["room-1", "room-2"] as const;

export type RoomId = (typeof ROOM_IDS)[number];
export type RoomTarget = RoomId | "all";

export const ROOM_LABELS: Record<RoomId, string> = {
  "room-1": "Room 1",
  "room-2": "Room 2",
};

export const COMPETITIONS = [
  {
    id: "line-follower",
    label: "Line Follower",
    shortLabel: "LF",
    asset: "/assets/logo/LF.webp",
    defaultRound: "Penyisihan",
    defaultTimerMs: 180000,
    defaultTimeoutMs: 0,
    scoring: "line-follower",
  },
  {
    id: "soccerbot",
    label: "Soccerbot",
    shortLabel: "Soccer",
    asset: "/assets/logo/Soccer.webp",
    defaultRound: "Babak Penyisihan",
    defaultTimerMs: 180000,
    defaultTimeoutMs: 60000,
    scoring: "regular",
  },
  {
    id: "soccerbot-penalty",
    label: "Soccerbot Penalty",
    shortLabel: "Penalty",
    asset: "/assets/logo/Soccer.webp",
    defaultRound: "Penalty",
    defaultTimerMs: 0,
    defaultTimeoutMs: 0,
    scoring: "penalty",
  },
  {
    id: "sumobot-rc",
    label: "Sumobot RC",
    shortLabel: "RC",
    asset: "/assets/logo/Sumo.webp",
    defaultRound: "Babak Grup",
    defaultTimerMs: 180000,
    defaultTimeoutMs: 45000,
    scoring: "regular",
  },
  {
    id: "sumobot-auto",
    label: "Sumobot Auto",
    shortLabel: "Auto",
    asset: "/assets/logo/Sumo.webp",
    defaultRound: "Babak Grup",
    defaultTimerMs: 180000,
    defaultTimeoutMs: 45000,
    scoring: "regular",
  },
  {
    id: "transporter",
    label: "Transporter",
    shortLabel: "Trans",
    asset: "/assets/logo/Trans.webp",
    defaultRound: "Penyisihan",
    defaultTimerMs: 180000,
    defaultTimeoutMs: 0,
    scoring: "transporter",
  },
] as const;

export type CompetitionId = (typeof COMPETITIONS)[number]["id"];
export type ScoringKind = (typeof COMPETITIONS)[number]["scoring"];

export type TransporterMode = "single" | "double";
export type LineFollowerMode = "dual" | "quad";
export type PenaltyMark = "empty" | "goal" | "miss";
export type TimerAction = "start" | "pause" | "reset";

export const LINE_FOLLOWER_ROUNDS = [
  "Penyisihan",
  "32 Besar",
  "16 Besar",
  "8 Besar",
  "Final",
] as const;

export const SOCCERBOT_ROUNDS = [
  "Babak Penyisihan",
  "Babak Knockout",
  "Semifinal",
  "Bronze Match",
  "Final",
] as const;

export const SUMOBOT_ROUNDS = [
  "Babak Grup",
  "Babak Penyisihan",
  "Semifinal",
  "Final",
] as const;

export const TRANSPORTER_ROUNDS = [
  "Penyisihan",
  "32 Besar",
  "16 Besar",
  "8 Besar",
  "Semifinal",
  "Final",
] as const;

export type TransporterRound = (typeof TRANSPORTER_ROUNDS)[number];

export const TRANSPORTER_ITEMS = [
  { key: "jingga", label: "Jingga", color: "#F7AD19" },
  { key: "cokelat", label: "Pink", color: "#D81B60" },
  { key: "biru", label: "Biru", color: "#173B8F" },
  { key: "ungu", label: "Ungu", color: "#630894" },
  { key: "kuning", label: "Kuning", color: "#FEE312" },
] as const;

export type TransporterItemKey = (typeof TRANSPORTER_ITEMS)[number]["key"];

export type TimerState = {
  durationMs: number;
  remainingMs: number;
  running: boolean;
  startedAt: number | null;
};

export type TeamState = {
  name: string;
  score: number;
  matchWins: number;
  penalty: PenaltyMark[];
  transporter: Record<TransporterItemKey, number>;
  transporterPenalty: boolean;
};

export type RoomState = {
  room: RoomId;
  competition: CompetitionId;
  displayTitle: string;
  round: string;
  transporterMode: TransporterMode;
  lineFollowerMode: LineFollowerMode;
  teams: [TeamState, TeamState, TeamState, TeamState];
  timer: TimerState;
  timeouts: [TimerState, TimerState];
};

export type ScoreboardState = {
  rooms: Record<RoomId, RoomState>;
  version: number;
  updatedAt: number;
};

export type ScoreboardPatch = {
  room: RoomTarget;
  state: RoomState;
};

export type TimerTarget = "main" | "timeout-0" | "timeout-1";

export type TimerCommand = {
  room: RoomTarget;
  target: TimerTarget;
  action: TimerAction;
};

export const DEFAULT_TEAM_NAMES = ["Tim A", "Tim B", "Tim C", "Tim D"] as const;

export function getCompetition(id: CompetitionId) {
  return COMPETITIONS.find((competition) => competition.id === id) ?? COMPETITIONS[0];
}

export function isCompetitionId(value: string | null): value is CompetitionId {
  return COMPETITIONS.some((competition) => competition.id === value);
}

export function createTimer(durationMs: number): TimerState {
  return {
    durationMs,
    remainingMs: durationMs,
    running: false,
    startedAt: null,
  };
}

export function createTeam(name: string): TeamState {
  return {
    name,
    score: 0,
    matchWins: 0,
    penalty: ["empty", "empty", "empty"],
    transporter: {
      jingga: 0,
      cokelat: 0,
      biru: 0,
      ungu: 0,
      kuning: 0,
    },
    transporterPenalty: false,
  };
}

export function createRoomState(room: RoomId): RoomState {
  const competition = getCompetition("line-follower");

  return {
    room,
    competition: competition.id,
    displayTitle: competition.label,
    round: competition.defaultRound,
    transporterMode: "double",
    lineFollowerMode: "dual",
    teams: DEFAULT_TEAM_NAMES.map((name) => createTeam(name)) as [
      TeamState,
      TeamState,
      TeamState,
      TeamState,
    ],
    timer: createTimer(competition.defaultTimerMs),
    timeouts: [
      createTimer(competition.defaultTimeoutMs),
      createTimer(competition.defaultTimeoutMs),
    ],
  };
}

export function createScoreboardState(): ScoreboardState {
  return {
    rooms: {
      "room-1": createRoomState("room-1"),
      "room-2": createRoomState("room-2"),
    },
    version: 1,
    updatedAt: Date.now(),
  };
}

export function cloneRoom(room: RoomState, nextRoomId: RoomId = room.room): RoomState {
  const teams = DEFAULT_TEAM_NAMES.map((name, index) => {
    const source = room.teams?.[index] ?? createTeam(name);

    return {
      ...source,
      penalty: [...source.penalty],
      transporter: { ...source.transporter },
    };
  }) as [TeamState, TeamState, TeamState, TeamState];

  const timeouts = [
    { ...(room.timeouts?.[0] ?? createTimer(0)) },
    { ...(room.timeouts?.[1] ?? createTimer(0)) },
  ] as [TimerState, TimerState];

  return {
    ...room,
    room: nextRoomId,
    lineFollowerMode: room.lineFollowerMode === "quad" ? "quad" : "dual",
    teams,
    timer: { ...(room.timer ?? createTimer(0)) },
    timeouts,
  };
}

export function normalizeTimer(timer: TimerState, now = Date.now()): TimerState {
  if (!timer.running || timer.startedAt === null) {
    return { ...timer };
  }

  const elapsed = now - timer.startedAt;
  const remainingMs = Math.max(0, timer.remainingMs - elapsed);

  return {
    ...timer,
    remainingMs,
    running: remainingMs > 0,
    startedAt: remainingMs > 0 ? now : null,
  };
}

export function resolveTimer(timer: TimerState, now = Date.now()): TimerState {
  if (!timer.running || timer.startedAt === null) {
    return timer;
  }

  const remainingMs = Math.max(0, timer.remainingMs - (now - timer.startedAt));

  return {
    ...timer,
    remainingMs,
    running: remainingMs > 0,
    startedAt: remainingMs > 0 ? timer.startedAt : null,
  };
}

export function applyTimerAction(timer: TimerState, action: TimerAction): TimerState {
  const live = resolveTimer(timer);

  if (action === "start") {
    return live.remainingMs > 0
      ? { ...live, running: true, startedAt: Date.now() }
      : live;
  }

  if (action === "pause") {
    return {
      ...live,
      running: false,
      startedAt: null,
    };
  }

  return createTimer(live.durationMs);
}

export function setTimerDuration(timer: TimerState, durationMs: number): TimerState {
  const nextDuration = Math.max(0, durationMs);

  return {
    durationMs: nextDuration,
    remainingMs: nextDuration,
    running: false,
    startedAt: null,
  };
}

export function getCompetitionTimeoutMs(id: CompetitionId) {
  return getCompetition(id).defaultTimeoutMs;
}

export function hasTimeoutTimers(id: CompetitionId, round?: string) {
  if (getCompetitionTimeoutMs(id) <= 0) {
    return false;
  }

  if (
    (id === "sumobot-rc" || id === "sumobot-auto") &&
    isSumobotGroupRound(round)
  ) {
    return false;
  }

  return true;
}

export function isTransporterHeadToHeadRound(round: string) {
  const normalizedRound = getTransporterRoundConfig(round).round;
  return normalizedRound !== "Penyisihan" && normalizedRound !== "32 Besar";
}

export function isSoccerbotBestOfThreeRound(id: CompetitionId, round: string) {
  return (
    id === "soccerbot" &&
    (round === "Semifinal" || round === "Bronze Match" || round === "Final")
  );
}

export function getTransporterRoundConfig(round: string) {
  const normalizedRound = TRANSPORTER_ROUNDS.includes(round as TransporterRound)
    ? (round as TransporterRound)
    : "Penyisihan";

  const values: Record<TransporterItemKey, number> = {
    jingga: 1,
    cokelat: 2,
    biru: 2,
    ungu: 0,
    kuning: 0,
  };
  let durationMs = 180000;

  if (normalizedRound === "16 Besar" || normalizedRound === "8 Besar") {
    values.ungu = 3;
  }

  if (normalizedRound === "Semifinal" || normalizedRound === "Final") {
    values.ungu = 3;
    values.kuning = 3;
  }

  if (
    normalizedRound === "8 Besar" ||
    normalizedRound === "Semifinal" ||
    normalizedRound === "Final"
  ) {
    durationMs = 120000;
  }

  return {
    round: normalizedRound,
    values,
    activeItems: TRANSPORTER_ITEMS.filter((item) => values[item.key] > 0),
    durationMs,
  };
}

export function calculateTransporterScore(team: TeamState, round: string) {
  const config = getTransporterRoundConfig(round);
  const subtotal = TRANSPORTER_ITEMS.reduce((total, item) => {
    return total + team.transporter[item.key] * config.values[item.key];
  }, 0);

  return subtotal + (team.transporterPenalty ? -2 : 0);
}

export function calculatePenaltyScore(team: TeamState) {
  return team.penalty.reduce((total, mark) => {
    if (mark === "goal") return total + 1;
    if (mark === "miss") return total - 1;
    return total;
  }, 0);
}

export function getTeamDisplayScore(room: RoomState, teamIndex: 0 | 1) {
  if (room.competition === "transporter") {
    return calculateTransporterScore(room.teams[teamIndex], room.round);
  }

  if (room.competition === "soccerbot-penalty") {
    return calculatePenaltyScore(room.teams[teamIndex]);
  }

  return room.teams[teamIndex].score;
}

export function formatClock(ms: number) {
  const safeMs = Math.max(0, ms);
  const minutes = Math.floor(safeMs / 60000).toString().padStart(2, "0");
  const seconds = Math.floor((safeMs % 60000) / 1000).toString().padStart(2, "0");
  const centiseconds = Math.floor((safeMs % 1000) / 10).toString().padStart(2, "0");

  return `${minutes}:${seconds}:${centiseconds}`;
}

export function parseClock(value: string) {
  const [minutes = "0", seconds = "0", centiseconds = "0"] = value.split(":");
  const parsedMinutes = Number.parseInt(minutes, 10);
  const parsedSeconds = Number.parseInt(seconds, 10);
  const parsedCentiseconds = Number.parseInt(centiseconds.padEnd(2, "0"), 10);

  if (
    Number.isNaN(parsedMinutes) ||
    Number.isNaN(parsedSeconds) ||
    Number.isNaN(parsedCentiseconds)
  ) {
    return 0;
  }

  return parsedMinutes * 60000 + parsedSeconds * 1000 + parsedCentiseconds * 10;
}

export function sanitizeRoomState(
  room: RoomState,
  roomId: RoomId,
  options: { incoming?: boolean } = {}
): RoomState {
  const competition = getCompetition(room.competition);
  const base = cloneRoom(room, roomId);
  base.competition = competition.id;
  base.displayTitle =
    typeof base.displayTitle === "string" ? base.displayTitle.slice(0, 40) : competition.label;
  base.round = base.round.trim() || competition.defaultRound;
  base.transporterMode = base.transporterMode === "single" ? "single" : "double";
  base.lineFollowerMode = base.lineFollowerMode === "quad" ? "quad" : "dual";
  base.teams = [
    normalizeTeam(base.teams[0], 0),
    normalizeTeam(base.teams[1], 1),
    normalizeTeam(base.teams[2], 2),
    normalizeTeam(base.teams[3], 3),
  ];

  if (base.competition === "transporter") {
    const config = getTransporterRoundConfig(base.round);
    base.round = config.round;
    if (base.timer.durationMs !== config.durationMs) {
      base.timer = setTimerDuration(base.timer, config.durationMs);
    } else {
      base.timer = options.incoming ? sanitizeIncomingTimer(base.timer) : normalizeTimer(base.timer);
    }
  } else {
    base.timer = options.incoming ? sanitizeIncomingTimer(base.timer) : normalizeTimer(base.timer);
  }

  const timeoutMs = hasTimeoutTimers(base.competition, base.round)
    ? getCompetitionTimeoutMs(base.competition)
    : 0;
  base.timeouts = [
    timeoutMs > 0
      ? options.incoming
        ? sanitizeIncomingTimer(base.timeouts[0])
        : normalizeTimer(base.timeouts[0])
      : createTimer(0),
    timeoutMs > 0
      ? options.incoming
        ? sanitizeIncomingTimer(base.timeouts[1])
        : normalizeTimer(base.timeouts[1])
      : createTimer(0),
  ];

  return base;
}

function sanitizeIncomingTimer(timer: TimerState): TimerState {
  const durationMs = Math.max(0, timer.durationMs);
  const remainingMs = Math.max(0, Math.min(durationMs, timer.remainingMs));

  return {
    durationMs,
    remainingMs,
    running: timer.running && remainingMs > 0,
    startedAt: timer.running && remainingMs > 0 ? Date.now() : null,
  };
}

function isSumobotGroupRound(round?: string) {
  const normalizedRound = round?.trim().toLowerCase();

  return normalizedRound === "babak grup" || normalizedRound === "grup";
}

function normalizeTeam(team: TeamState, index: 0 | 1 | 2 | 3): TeamState {
  return {
    ...createTeam(DEFAULT_TEAM_NAMES[index]),
    ...team,
    name: team.name.trim().slice(0, 28) || DEFAULT_TEAM_NAMES[index],
    score: clampScore(team.score),
    matchWins: clampMatchWins(team.matchWins),
    penalty: normalizePenalty(team.penalty),
    transporter: normalizeTransporter(team.transporter),
    transporterPenalty: Boolean(team.transporterPenalty),
  };
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(9999, Math.round(score)));
}

function clampMatchWins(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(2, Math.round(score)));
}

function normalizePenalty(penalty: PenaltyMark[]) {
  const allowed = new Set<PenaltyMark>(["empty", "goal", "miss"]);
  const normalized = penalty.slice(0, 3).map((mark) => (allowed.has(mark) ? mark : "empty"));

  while (normalized.length < 3) {
    normalized.push("empty");
  }

  return normalized as [PenaltyMark, PenaltyMark, PenaltyMark];
}

function normalizeTransporter(transporter: Record<TransporterItemKey, number>) {
  return TRANSPORTER_ITEMS.reduce(
    (next, item) => ({
      ...next,
      [item.key]: clampTransporterCount(transporter?.[item.key] ?? 0),
    }),
    {} as Record<TransporterItemKey, number>
  );
}

function clampTransporterCount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(9, Math.round(value)));
}
