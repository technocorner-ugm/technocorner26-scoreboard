"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  CircleSlash,
  Clock3,
  Minus,
  MonitorUp,
  Pause,
  Play,
  Plus,
  RadioTower,
  RotateCcw,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import {
  COMPETITIONS,
  LINE_FOLLOWER_ROUNDS,
  LOCAL_ROOM_IDS,
  ROOM_IDS,
  ROOM_LOCAL_IDS,
  ROOM_SHORT_LABELS,
  ROOM_VENUES,
  SOCCERBOT_ROUNDS,
  SUMOBOT_ROUNDS,
  TRANSPORTER_ROUNDS,
  VENUE_IDS,
  VENUE_LABELS,
  calculatePenaltyScore,
  calculateTransporterScore,
  cloneRoom,
  createScoreboardState,
  createTimer,
  formatClock,
  getCompetition,
  getRoomDisplayLabel,
  getRoomId,
  getTeamDisplayScore,
  getTransporterRoundConfig,
  getVenueRoomIds,
  hasTimeoutTimers,
  isSoccerbotBestOfThreeRound,
  isTransporterHeadToHeadRound,
  isVenueId,
  parseClock,
  resolveRoomId,
  resolveTimer,
  setTimerDuration,
  type CompetitionId,
  type LineFollowerMode,
  type LocalRoomId,
  type PenaltyMark,
  type RoomId,
  type RoomState,
  type RoomTarget,
  type ScoreboardState,
  type TeamState,
  type TimerAction,
  type TimerCommand,
  type TimerState,
  type TimerTarget,
  type TransporterItemKey,
  type TransporterMode,
  type VenueId,
} from "@/lib/scoreboard";

const TEAM_INDEXES = [0, 1] as const;
type TeamIndex = 0 | 1 | 2 | 3;
const REGULAR_ROUNDS: Record<CompetitionId, string[]> = {
  "line-follower": [...LINE_FOLLOWER_ROUNDS],
  soccerbot: [...SOCCERBOT_ROUNDS],
  "soccerbot-penalty": ["Penalty"],
  "sumobot-rc": [...SUMOBOT_ROUNDS],
  "sumobot-auto": [...SUMOBOT_ROUNDS],
  transporter: [...TRANSPORTER_ROUNDS],
};

type ViewMode = "operator" | "display";

export default function ScoreboardClient({
  initialRoom = "gedung-a-room-1",
  initialViewMode = "operator",
}: {
  initialRoom?: RoomId;
  initialViewMode?: ViewMode;
} = {}) {
  const [board, setBoard] = useState<ScoreboardState | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomId>(initialRoom);
  const [applyToAllRooms, setApplyToAllRooms] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [apiError, setApiError] = useState<string | null>(null);
  const [, setPending] = useState(false);
  const [origin, setOrigin] = useState("");
  const [, setClockPulse] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get("room");
      const venueParam = params.get("venue");
      const viewParam = params.get("view");
      const resolvedRoom = resolveRoomId(roomParam, venueParam);

      if (resolvedRoom) {
        setSelectedRoom(resolvedRoom);
      }

      if (viewParam === "display") {
        setViewMode("display");
      }

      setOrigin(window.location.origin);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialState() {
      try {
        const response = await fetch("/api/scoreboard", { cache: "no-store" });
        const data = (await response.json()) as ScoreboardState;

        if (active) {
          setBoard(localizeScoreboardState(data));
          setApiError(null);
        }
      } catch {
        if (active) {
          setBoard(createScoreboardState());
          setApiError("API belum bisa dibaca. Menampilkan state lokal sementara.");
        }
      }
    }

    loadInitialState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/scoreboard/events");

    source.addEventListener("scoreboard", (event) => {
      const message = event as MessageEvent<string>;
      setBoard(localizeScoreboardState(JSON.parse(message.data) as ScoreboardState));
      setApiError(null);
    });

    source.onerror = () => {
      setApiError("Realtime reconnecting. Update terakhir tetap dipakai.");
    };

    return () => {
      source.close();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockPulse((value) => value + 1);
    }, 80);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const currentRoom = board?.rooms[selectedRoom] ?? null;
  const selectedVenue = ROOM_VENUES[selectedRoom];
  const selectedLocalRoom = ROOM_LOCAL_IDS[selectedRoom];
  const venueRoomIds = getVenueRoomIds(selectedVenue);
  const targetRoom: RoomTarget = applyToAllRooms ? selectedVenue : selectedRoom;

  async function commitRoom(nextRoom: RoomState, target: RoomTarget = targetRoom) {
    const committedRoom = prepareRoomForCommit(nextRoom);
    setApiError(null);
    setPending(true);
    setBoard((previous) => optimisticBoard(previous, target, committedRoom));

    try {
      const response = await fetch("/api/scoreboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: target, state: committedRoom }),
      });

      if (!response.ok) {
        throw new Error("PATCH failed");
      }

      setBoard(localizeScoreboardState((await response.json()) as ScoreboardState));
    } catch {
      setApiError("Update belum terkirim ke server. Cek dev server/API.");
    } finally {
      setPending(false);
    }
  }

  async function resetRooms(target: RoomTarget = targetRoom) {
    setPending(true);
    setApiError(null);

    try {
      const response = await fetch(`/api/scoreboard?room=${target}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("DELETE failed");
      }

      setBoard(localizeScoreboardState((await response.json()) as ScoreboardState));
    } catch {
      setApiError("Reset gagal dikirim ke server.");
    } finally {
      setPending(false);
    }
  }

  function updateCurrentRoom(updater: (room: RoomState) => RoomState) {
    if (!currentRoom) return;
    commitRoom(updater(cloneRoom(currentRoom)));
  }

  async function commandTimer(target: TimerTarget, action: TimerAction) {
    const command: TimerCommand = {
      room: targetRoom,
      target,
      action,
    };

    setApiError(null);
    setPending(true);

    try {
      const response = await fetch("/api/scoreboard/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error("Timer command failed");
      }

      setBoard(localizeScoreboardState((await response.json()) as ScoreboardState));
    } catch {
      setApiError("Aksi timer belum terkirim ke server. Cek dev server/API.");
    } finally {
      setPending(false);
    }
  }

  if (!currentRoom) {
    return <LoadingState />;
  }

  if (viewMode === "display") {
    return (
      <main className="display-shell">
        <ScoreboardStage room={currentRoom} />
        <div className="display-switcher" aria-label="Display room selector">
          {ROOM_IDS.map((roomId) => (
            <button
              type="button"
              key={roomId}
              className={roomId === selectedRoom ? "is-active" : ""}
              onClick={() => setSelectedRoom(roomId)}
              aria-label={getRoomDisplayLabel(roomId)}
              title={getRoomDisplayLabel(roomId)}
            >
              {ROOM_SHORT_LABELS[roomId]}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="scoreboard-shell">
      <section className="operator-topbar">
        <div className="brand-lockup">
          <Image src="/Logo.webp" alt="Technocorner logo" width={56} height={56} priority />
          <div>
            <p className="eyebrow">Technocorner 2026</p>
            <h1>Scoreboard Control</h1>
          </div>
        </div>
      </section>

      <section className="operator-grid">
        <aside className="control-panel room-panel">
          <PanelTitle icon={<RadioTower size={18} />} title="Lokasi & Room" />
          <div className="room-selector-stack">
            <SegmentedControl
              value={selectedVenue}
              options={VENUE_IDS.map((venue) => ({
                value: venue,
                label: VENUE_LABELS[venue],
              }))}
              onChange={(value) =>
                setSelectedRoom(getRoomId(value as VenueId, selectedLocalRoom))
              }
            />
            <SegmentedControl
              value={selectedLocalRoom}
              options={LOCAL_ROOM_IDS.map((room) => ({
                value: room,
                label: room === "room-1" ? "Room 1" : "Room 2",
              }))}
              onChange={(value) =>
                setSelectedRoom(getRoomId(selectedVenue, value as LocalRoomId))
              }
            />
          </div>

          <label className="toggle-line">
            <input
              type="checkbox"
              checked={applyToAllRooms}
              onChange={(event) => setApplyToAllRooms(event.target.checked)}
            />
            <span>
              <Users size={16} />
              Update semua room di {VENUE_LABELS[selectedVenue]}
            </span>
          </label>

          <div className="display-link-grid">
            {venueRoomIds.map((roomId) => (
              <a
                key={roomId}
                href={`${origin || ""}/display/${ROOM_VENUES[roomId]}/${ROOM_LOCAL_IDS[roomId]}`}
                target="_blank"
                rel="noreferrer"
              >
                <MonitorUp size={15} />
                Display {getRoomDisplayLabel(roomId)}
                <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        </aside>

        <section className="control-panel competition-panel">
          <PanelTitle icon={<Trophy size={18} />} title="Kompetisi" />
          <div className="competition-grid">
            {COMPETITIONS.map((competition) => (
              <button
                type="button"
                key={competition.id}
                className={currentRoom.competition === competition.id ? "competition-btn is-active" : "competition-btn"}
                onClick={() =>
                  updateCurrentRoom((room) => changeCompetition(room, competition.id))
                }
              >
                <Image src={competition.asset} alt="" width={42} height={42} />
                <span>{competition.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="preview-panel">
          <ScoreboardStage room={currentRoom} />
        </section>

        <section className="control-panel settings-panel">
          <PanelTitle icon={<Settings2 size={18} />} title="Match Setup" />
          <RoundEditor room={currentRoom} onChange={updateCurrentRoom} />
          <label className="field-stack">
            <span>Judul Papan Skor</span>
            <input
              value={currentRoom.displayTitle}
              maxLength={40}
              onChange={(event) =>
                updateCurrentRoom((room) => ({
                  ...room,
                  displayTitle: event.target.value,
                }))
              }
            />
          </label>
          <TimerEditor
            label="Timer Utama"
            timer={currentRoom.timer}
            disabled={currentRoom.competition === "soccerbot-penalty"}
            onTimerAction={(action) => commandTimer("main", action)}
            onDurationChange={(durationMs) =>
              updateCurrentRoom((room) => ({
                ...room,
                timer: setTimerDuration(room.timer, durationMs),
              }))
            }
          />

          {currentRoom.competition === "line-follower" ? (
            <SegmentedControl
              value={currentRoom.lineFollowerMode}
              options={[
                { value: "dual", label: "2 Tim" },
                { value: "quad", label: "4 Tim" },
              ]}
              onChange={(value) =>
                updateCurrentRoom((room) => ({
                  ...room,
                  lineFollowerMode: value as LineFollowerMode,
                }))
              }
            />
          ) : null}

          {currentRoom.competition === "transporter" ? (
            <SegmentedControl
              value={currentRoom.transporterMode}
              options={[
                { value: "single", label: "Single" },
                { value: "double", label: "Double" },
              ]}
              onChange={(value) =>
                updateCurrentRoom((room) => ({
                  ...room,
                  transporterMode: value as TransporterMode,
                }))
              }
            />
          ) : null}

          <button type="button" className="danger-action" onClick={() => resetRooms()}>
            <RotateCcw size={16} />
            Reset{" "}
            {applyToAllRooms
              ? `Semua Room ${VENUE_LABELS[selectedVenue]}`
              : getRoomDisplayLabel(selectedRoom)}
          </button>
        </section>

        <section className="team-editor-grid">
          {getActiveTeamIndexes(currentRoom).map((teamIndex) => (
            <TeamEditor
              key={teamIndex}
              room={currentRoom}
              teamIndex={teamIndex}
              onChange={updateCurrentRoom}
              onTimerAction={commandTimer}
            />
          ))}
        </section>
      </section>

      {apiError ? <p className="api-error">{apiError}</p> : null}
    </main>
  );
}

function ScoreboardStage({ room }: { room: RoomState }) {
  const competition = getCompetition(room.competition);
  const liveTimer = resolveTimer(room.timer);
  const activeTeamIndexes = getScoreTeamIndexes(room);
  const transporterConfig =
    room.competition === "transporter" ? getTransporterRoundConfig(room.round) : null;
  const showVersus =
    activeTeamIndexes.length === 2 &&
    (room.competition !== "transporter" || isTransporterHeadToHeadRound(room.round));
  const showSeriesScore = isSoccerbotBestOfThreeRound(room.competition, room.round);
  const scoreDuelClassName = [
    activeTeamIndexes.length === 1 ? "score-duel is-single" : "score-duel",
    showSeriesScore ? "has-series-score" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (room.competition === "line-follower") {
    return <LineFollowerStage room={room} />;
  }

  return (
    <section className="score-stage" aria-label={`${getRoomDisplayLabel(room.room)} scoreboard`}>
      <div className="stage-backdrop" />
      <header className="stage-header">
        <div className="stage-title">
          <Image src={competition.asset} alt="" width={64} height={64} />
          <div>
            <p>{getRoomDisplayLabel(room.room)}</p>
            <h2>{getDisplayTitle(room)}</h2>
          </div>
        </div>
        <div className="stage-round">
          <span>{room.round}</span>
          {room.competition === "transporter" ? <b>{room.transporterMode}</b> : null}
        </div>
      </header>

      <div className={scoreDuelClassName}>
        {activeTeamIndexes.map((teamIndex) => (
          <article className={`team-score team-${teamIndex + 1}`} key={teamIndex}>
            {showSeriesScore ? (
              <div className="series-score" aria-label={`${room.teams[teamIndex].matchWins} match menang`}>
                <span>Match Menang</span>
                <b>{room.teams[teamIndex].matchWins}</b>
              </div>
            ) : null}
            <label>{getStageTeamLabel(room, teamIndex)}</label>
            <h3>{room.teams[teamIndex].name}</h3>
            <strong>{getTeamDisplayScore(room, teamIndex)}</strong>
            {room.competition === "soccerbot-penalty" ? (
              <PenaltyMarks team={room.teams[teamIndex]} />
            ) : null}
            {room.competition === "transporter" ? (
              <TransporterMini team={room.teams[teamIndex]} round={room.round} />
            ) : null}
            {hasTimeoutTimers(room.competition, room.round) ? (
              <TeamTimeoutReadout timer={room.timeouts[teamIndex]} />
            ) : null}
          </article>
        ))}
      </div>

      {showVersus ? <div className="versus-mark">VS</div> : null}

      <footer className="stage-footer">
        {room.competition !== "soccerbot-penalty" ? (
          <div className={liveTimer.running ? "stage-clock is-running" : "stage-clock"}>
            <Clock3 size={22} />
            {formatClock(liveTimer.remainingMs)}
          </div>
        ) : (
          <div className="stage-clock is-idle">
            <Activity size={22} />
            Penalty Shootout
          </div>
        )}

        {transporterConfig ? (
          <div className="cargo-values">
            {transporterConfig.activeItems.map((item) => (
              <span key={item.key} style={{ "--cargo-color": item.color } as CSSProperties}>
                {item.label} +{transporterConfig.values[item.key]}
              </span>
            ))}
          </div>
        ) : null}
      </footer>
    </section>
  );
}

function TeamTimeoutReadout({ timer }: { timer: TimerState }) {
  const liveTimer = resolveTimer(timer);

  return (
    <div className={liveTimer.running ? "team-timeout is-running" : "team-timeout"}>
      <span>Timeout</span>
      <b>{formatClock(liveTimer.remainingMs)}</b>
    </div>
  );
}

function LineFollowerStage({ room }: { room: RoomState }) {
  const competition = getCompetition(room.competition);
  const liveTimer = resolveTimer(room.timer);
  const matches = room.lineFollowerMode === "quad" ? [[0, 1], [2, 3]] : [[0, 1]];

  return (
    <section className="score-stage line-follower-stage" aria-label={`${getRoomDisplayLabel(room.room)} line follower`}>
      <div className="stage-backdrop" />
      <header className="stage-header">
        <div className="stage-title">
          <Image src={competition.asset} alt="" width={64} height={64} />
          <div>
            <p>{getRoomDisplayLabel(room.room)}</p>
            <h2>{getDisplayTitle(room)}</h2>
          </div>
        </div>
        <div className="stage-round">
          <span>{room.round}</span>
          <b>{room.lineFollowerMode === "quad" ? "2 Track" : "1 Track"}</b>
        </div>
      </header>

      <div className={room.lineFollowerMode === "quad" ? "lf-match-grid is-quad" : "lf-match-grid"}>
        {matches.map(([leftIndex, rightIndex], matchIndex) => (
          <article className="lf-match" key={matchIndex}>
            <span>Track {matchIndex + 1}</span>
            <div className="lf-team is-red">
              <small>Merah</small>
              <h3>{room.teams[leftIndex].name}</h3>
            </div>
            <div className="lf-team is-blue">
              <small>Biru</small>
              <h3>{room.teams[rightIndex].name}</h3>
            </div>
          </article>
        ))}
      </div>

      <footer className="stage-footer line-follower-footer">
        <div className={liveTimer.running ? "stage-clock lf-main-clock is-running" : "stage-clock lf-main-clock"}>
          <Clock3 size={28} />
          {formatClock(liveTimer.remainingMs)}
        </div>
      </footer>
    </section>
  );
}

function TeamEditor({
  room,
  teamIndex,
  onChange,
  onTimerAction,
}: {
  room: RoomState;
  teamIndex: TeamIndex;
  onChange: (updater: (room: RoomState) => RoomState) => void;
  onTimerAction: (target: TimerTarget, action: TimerAction) => void;
}) {
  const team = room.teams[teamIndex];
  const isTransporter = room.competition === "transporter";
  const isPenalty = room.competition === "soccerbot-penalty";
  const isLineFollower = room.competition === "line-follower";
  const isSoccerbotBestOfThree = isSoccerbotBestOfThreeRound(
    room.competition,
    room.round
  );
  const lineFollowerSideClass = isLineFollower
    ? teamIndex % 2 === 0
      ? "is-lf-red"
      : "is-lf-blue"
    : "";

  return (
    <article
      className={`control-panel team-editor team-${teamIndex + 1} ${lineFollowerSideClass}`}
    >
      <PanelTitle title={getTeamEditorTitle(room, teamIndex)} icon={<Users size={18} />} />

      <label className="field-stack">
        <span>Nama Tim</span>
        <input
          value={team.name}
          maxLength={28}
          onChange={(event) =>
            onChange((roomState) => updateTeam(roomState, teamIndex, (nextTeam) => ({
              ...nextTeam,
              name: event.target.value,
            })))
          }
        />
      </label>

      {isTransporter ? (
        <TransporterControls room={room} teamIndex={teamIndex as 0 | 1} onChange={onChange} />
      ) : null}

      {isPenalty ? (
        <PenaltyControls room={room} teamIndex={teamIndex as 0 | 1} onChange={onChange} />
      ) : null}

      {!isTransporter && !isPenalty && !isLineFollower ? (
        <>
          {isSoccerbotBestOfThree ? (
            <div className="score-control is-series">
              <p>Match Menang (BO3)</p>
              <div>
                <button
                  type="button"
                  aria-label={`Kurangi match menang ${team.name}`}
                  onClick={() =>
                    onChange((roomState) =>
                      updateTeamMatchWins(roomState, teamIndex as 0 | 1, -1)
                    )
                  }
                >
                  <Minus size={17} />
                </button>
                <strong>{team.matchWins}</strong>
                <button
                  type="button"
                  aria-label={`Tambah match menang ${team.name}`}
                  onClick={() =>
                    onChange((roomState) =>
                      updateTeamMatchWins(roomState, teamIndex as 0 | 1, 1)
                    )
                  }
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>
          ) : null}
          <div className="score-control">
            <p>Score</p>
            <div>
              <button
                type="button"
                aria-label={`Kurangi skor ${team.name}`}
                onClick={() =>
                  onChange((roomState) => updateTeamScore(roomState, teamIndex as 0 | 1, -1))
                }
              >
                <Minus size={17} />
              </button>
              <strong>{team.score}</strong>
              <button
                type="button"
                aria-label={`Tambah skor ${team.name}`}
                onClick={() =>
                  onChange((roomState) => updateTeamScore(roomState, teamIndex as 0 | 1, 1))
                }
              >
                <Plus size={17} />
              </button>
            </div>
          </div>
        </>
      ) : null}

      {hasTimeoutTimers(room.competition, room.round) && isPrimaryTeamIndex(teamIndex) ? (
        <TimerEditor
          label="Timeout"
          timer={room.timeouts[teamIndex]}
          compact
          onTimerAction={(action) => onTimerAction(teamIndex === 0 ? "timeout-0" : "timeout-1", action)}
          onDurationChange={(durationMs) =>
            onChange((roomState) => setTimeoutDuration(roomState, teamIndex, durationMs))
          }
        />
      ) : null}
    </article>
  );
}

function getTeamEditorTitle(room: RoomState, teamIndex: TeamIndex) {
  if (room.competition === "line-follower") {
    return [
      "Track 1 Merah",
      "Track 1 Biru",
      "Track 2 Merah",
      "Track 2 Biru",
    ][teamIndex];
  }

  if (
    room.competition === "transporter" &&
    !isTransporterHeadToHeadRound(room.round)
  ) {
    return teamIndex === 0 ? "Peserta 1" : "Peserta 2";
  }

  return teamIndex === 0 ? "Tim Kiri" : "Tim Kanan";
}

function TransporterControls({
  room,
  teamIndex,
  onChange,
}: {
  room: RoomState;
  teamIndex: 0 | 1;
  onChange: (updater: (room: RoomState) => RoomState) => void;
}) {
  const team = room.teams[teamIndex];
  const roundConfig = getTransporterRoundConfig(room.round);

  return (
    <div className="transporter-control">
      <div className="score-control is-total">
        <p>Total Point</p>
        <strong>{calculateTransporterScore(team, room.round)}</strong>
      </div>

      <div className="cargo-control-grid">
        {roundConfig.activeItems.map((item) => (
          <div className="cargo-control" key={item.key}>
            <span style={{ "--cargo-color": item.color } as CSSProperties}>{item.label}</span>
            <div>
              <button
                type="button"
                onClick={() =>
                  onChange((roomState) =>
                    updateTransporterCount(roomState, teamIndex, item.key, -1)
                  )
                }
              >
                <Minus size={15} />
              </button>
              <b>{team.transporter[item.key]}</b>
              <button
                type="button"
                onClick={() =>
                  onChange((roomState) =>
                    updateTransporterCount(roomState, teamIndex, item.key, 1)
                  )
                }
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className="toggle-line penalty-toggle">
        <input
          type="checkbox"
          checked={team.transporterPenalty}
          onChange={(event) =>
            onChange((roomState) => updateTeam(roomState, teamIndex, (nextTeam) => ({
              ...nextTeam,
              transporterPenalty: event.target.checked,
            })))
          }
        />
        <span>Penalty -2</span>
      </label>
    </div>
  );
}

function PenaltyControls({
  room,
  teamIndex,
  onChange,
}: {
  room: RoomState;
  teamIndex: 0 | 1;
  onChange: (updater: (room: RoomState) => RoomState) => void;
}) {
  const team = room.teams[teamIndex];

  return (
    <div className="penalty-control">
      <div className="score-control is-total">
        <p>Total Penalty</p>
        <strong>{calculatePenaltyScore(team)}</strong>
      </div>
      <div className="penalty-shot-grid">
        {team.penalty.map((mark, shotIndex) => (
          <PenaltyShotButton
            key={shotIndex}
            mark={mark}
            shotIndex={shotIndex}
            onClick={() =>
              onChange((roomState) =>
                updatePenaltyMark(roomState, teamIndex, shotIndex, nextPenaltyMark(mark))
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function PenaltyShotButton({
  mark,
  shotIndex,
  onClick,
}: {
  mark: PenaltyMark;
  shotIndex: number;
  onClick: () => void;
}) {
  const Icon = mark === "goal" ? Check : mark === "miss" ? CircleSlash : Minus;
  const label = mark === "goal" ? "Goal" : mark === "miss" ? "Miss" : "Empty";

  return (
    <button type="button" className={`penalty-shot is-${mark}`} onClick={onClick}>
      <Icon size={18} />
      <span>Shot {shotIndex + 1}</span>
      <b>{label}</b>
    </button>
  );
}

function RoundEditor({
  room,
  onChange,
}: {
  room: RoomState;
  onChange: (updater: (room: RoomState) => RoomState) => void;
}) {
  const rounds = REGULAR_ROUNDS[room.competition];

  return (
    <label className="field-stack">
      <span>Babak</span>
      <select
        value={room.round}
        onChange={(event) =>
          onChange((roomState) => {
            const timeoutWasEnabled = hasTimeoutTimers(
              roomState.competition,
              roomState.round
            );
            const next = {
              ...roomState,
              round: event.target.value,
            };

            if (next.competition === "transporter") {
              next.timer = createTimer(getTransporterRoundConfig(next.round).durationMs);
            }

            const timeoutIsEnabled = hasTimeoutTimers(next.competition, next.round);

            if (!timeoutIsEnabled) {
              next.timeouts = [createTimer(0), createTimer(0)];
            } else if (!timeoutWasEnabled) {
              const timeoutMs = getCompetition(next.competition).defaultTimeoutMs;
              next.timeouts = [createTimer(timeoutMs), createTimer(timeoutMs)];
            }

            return next;
          })
        }
      >
        {rounds.map((round) => (
          <option key={round} value={round}>
            {round}
          </option>
        ))}
      </select>
    </label>
  );
}

function TimerEditor({
  label,
  timer,
  disabled = false,
  compact = false,
  onTimerAction,
  onDurationChange,
}: {
  label: string;
  timer: TimerState;
  disabled?: boolean;
  compact?: boolean;
  onTimerAction: (action: TimerAction) => void;
  onDurationChange: (durationMs: number) => void;
}) {
  const [draft, setDraft] = useState(formatClock(timer.durationMs));
  const liveTimer = resolveTimer(timer);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDraft(formatClock(timer.durationMs));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [timer.durationMs]);

  if (disabled) {
    return (
      <div className="timer-editor is-disabled">
        <Clock3 size={18} />
        <span>Timer nonaktif untuk penalty</span>
      </div>
    );
  }

  return (
    <div className={compact ? "timer-editor is-compact" : "timer-editor"}>
      <label className="field-stack">
        <span>{label}</span>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onDurationChange(parseClock(draft))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onDurationChange(parseClock(draft));
            }
          }}
          inputMode="numeric"
        />
      </label>

      <div className="timer-readout">{formatClock(liveTimer.remainingMs)}</div>
      <div className="timer-actions">
        <button type="button" onClick={() => onTimerAction("start")} disabled={liveTimer.running}>
          <Play size={16} />
          Start
        </button>
        <button type="button" onClick={() => onTimerAction("pause")} disabled={!liveTimer.running}>
          <Pause size={16} />
          Stop
        </button>
        <button type="button" onClick={() => onTimerAction("reset")}>
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}

function PenaltyMarks({ team }: { team: TeamState }) {
  return (
    <div className="penalty-marks">
      {team.penalty.map((mark, index) => (
        <span key={index} className={`is-${mark}`} />
      ))}
    </div>
  );
}

function TransporterMini({ team, round }: { team: TeamState; round: string }) {
  const config = getTransporterRoundConfig(round);

  return (
    <div className="transporter-mini">
      {config.activeItems.map((item) => (
        <span key={item.key} style={{ "--cargo-color": item.color } as CSSProperties}>
          {team.transporter[item.key]}
        </span>
      ))}
      {team.transporterPenalty ? <b>-2</b> : null}
    </div>
  );
}

function PanelTitle({ icon, title }: { icon?: ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <main className="scoreboard-shell is-loading">
      <div className="loading-panel">
        <span className="pulse-dot is-pending" />
        Loading scoreboard state
      </div>
    </main>
  );
}

function getActiveTeamIndexes(room: RoomState): readonly TeamIndex[] {
  if (room.competition === "line-follower") {
    return room.lineFollowerMode === "quad" ? [0, 1, 2, 3] : [0, 1];
  }

  if (room.competition === "transporter" && room.transporterMode === "single") {
    return [0] as const;
  }

  return TEAM_INDEXES;
}

function isPrimaryTeamIndex(teamIndex: TeamIndex): teamIndex is 0 | 1 {
  return teamIndex === 0 || teamIndex === 1;
}

function getScoreTeamIndexes(room: RoomState) {
  if (room.competition === "transporter" && room.transporterMode === "single") {
    return [0] as const;
  }

  return TEAM_INDEXES;
}

function getStageTeamLabel(room: RoomState, teamIndex: 0 | 1) {
  if (
    room.competition === "transporter" &&
    !isTransporterHeadToHeadRound(room.round)
  ) {
    return `Peserta ${teamIndex + 1}`;
  }

  return teamIndex === 0 ? "Team Left" : "Team Right";
}

function getDisplayTitle(room: RoomState) {
  return room.displayTitle.trim() || getCompetition(room.competition).label;
}

function changeCompetition(room: RoomState, competitionId: CompetitionId) {
  const competition = getCompetition(competitionId);
  const next = cloneRoom(room);
  next.competition = competition.id;
  next.displayTitle = competition.label;
  next.round = competition.defaultRound;
  next.timer = createTimer(competition.defaultTimerMs);
  const timeoutMs = hasTimeoutTimers(competition.id, competition.defaultRound)
    ? competition.defaultTimeoutMs
    : 0;
  next.timeouts = [createTimer(timeoutMs), createTimer(timeoutMs)];

  if (competition.id === "transporter") {
    next.timer = createTimer(getTransporterRoundConfig(competition.defaultRound).durationMs);
  }

  return next;
}

function updateTeam(
  room: RoomState,
  teamIndex: TeamIndex,
  updater: (team: TeamState) => TeamState
) {
  const next = cloneRoom(room);
  const teams = [...next.teams] as [TeamState, TeamState, TeamState, TeamState];
  teams[teamIndex] = updater({ ...teams[teamIndex] });
  next.teams = teams;
  return next;
}

function updateTeamScore(room: RoomState, teamIndex: 0 | 1, delta: number) {
  return updateTeam(room, teamIndex, (team) => ({
    ...team,
    score: Math.max(0, Math.min(9999, team.score + delta)),
  }));
}

function updateTeamMatchWins(room: RoomState, teamIndex: 0 | 1, delta: number) {
  return updateTeam(room, teamIndex, (team) => ({
    ...team,
    matchWins: Math.max(0, Math.min(2, team.matchWins + delta)),
  }));
}

function updateTransporterCount(
  room: RoomState,
  teamIndex: 0 | 1,
  itemKey: TransporterItemKey,
  delta: number
) {
  return updateTeam(room, teamIndex, (team) => ({
    ...team,
    transporter: {
      ...team.transporter,
      [itemKey]: Math.max(0, Math.min(9, team.transporter[itemKey] + delta)),
    },
  }));
}

function updatePenaltyMark(
  room: RoomState,
  teamIndex: 0 | 1,
  shotIndex: number,
  mark: PenaltyMark
) {
  return updateTeam(room, teamIndex, (team) => {
    const penalty = [...team.penalty];
    penalty[shotIndex] = mark;

    return {
      ...team,
      penalty,
    };
  });
}

function setTimeoutDuration(room: RoomState, timeoutIndex: 0 | 1, durationMs: number) {
  const next = cloneRoom(room);
  next.timeouts[timeoutIndex] = setTimerDuration(next.timeouts[timeoutIndex], durationMs);
  return next;
}

function nextPenaltyMark(mark: PenaltyMark): PenaltyMark {
  if (mark === "empty") return "goal";
  if (mark === "goal") return "miss";
  return "empty";
}

function optimisticBoard(
  previous: ScoreboardState | null,
  target: RoomTarget,
  nextRoom: RoomState
): ScoreboardState {
  const base = previous ?? createScoreboardState();
  const rooms = { ...base.rooms };
  const targetRoomIds =
    target === "all"
      ? ROOM_IDS
      : isVenueId(target)
        ? getVenueRoomIds(target)
        : [target];

  targetRoomIds.forEach((roomId) => {
    rooms[roomId] = prepareRoomForCommit(cloneRoom(nextRoom, roomId));
  });

  return {
    rooms,
    version: base.version + 1,
    updatedAt: Date.now(),
  };
}

function prepareRoomForCommit(room: RoomState) {
  const next = cloneRoom(room);
  next.timer = resolveAndReanchorTimer(next.timer);
  next.timeouts = [
    resolveAndReanchorTimer(next.timeouts[0]),
    resolveAndReanchorTimer(next.timeouts[1]),
  ];
  return next;
}

function resolveAndReanchorTimer(timer: TimerState) {
  const liveTimer = resolveTimer(timer);

  return {
    ...liveTimer,
    startedAt: liveTimer.running ? Date.now() : null,
  };
}

function localizeScoreboardState(state: ScoreboardState) {
  const localNow = Date.now();
  const serverNow = state.updatedAt;

  return {
    ...state,
    rooms: ROOM_IDS.reduce(
      (rooms, roomId) => ({
        ...rooms,
        [roomId]: localizeRoomTimers(state.rooms[roomId], serverNow, localNow),
      }),
      {} as ScoreboardState["rooms"]
    ),
  };
}

function localizeRoomTimers(room: RoomState, serverNow: number, localNow: number) {
  return {
    ...room,
    timer: localizeTimer(room.timer, serverNow, localNow),
    timeouts: [
      localizeTimer(room.timeouts[0], serverNow, localNow),
      localizeTimer(room.timeouts[1], serverNow, localNow),
    ] as [TimerState, TimerState],
  };
}

function localizeTimer(timer: TimerState, serverNow: number, localNow: number) {
  if (!timer.running || timer.startedAt === null) {
    return timer;
  }

  const elapsedAtResponse = Math.max(0, serverNow - timer.startedAt);

  return {
    ...timer,
    startedAt: localNow - elapsedAtResponse,
  };
}
