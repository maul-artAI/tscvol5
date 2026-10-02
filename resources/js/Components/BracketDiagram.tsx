
import { useLayoutEffect, useRef, useState } from "react";
import type { Team } from "../lib/api";

export type BracketMatch = {
  id: number;
  slot?: string | null;
  lapangan?: string | null;
  status: string;
  match_date?: string | null;
  kickoff?: string | null;
  round_label?: string | null;
  team1_score: number;
  team2_score: number;
  period?: string | null;
  clock_display?: string | null;
  team1?: Team | null;
  team2?: Team | null;
  winner_next_match_id?: number | null;
  winner_next_side?: string | null;
  loser_next_match_id?: number | null;
  loser_next_side?: string | null;
  is_walkover?: boolean;
  penalty1?: number | null;
  penalty2?: number | null;
  is_penalty?: boolean;
};

export type BracketRound = { order: number; label: string; matches: BracketMatch[] };

type Line = { d: string; hot: boolean };

/** Lencana peringkat: 1 emas, 2 perak, 3 perunggu. */
export function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const styles = {
    1: "bg-amber-400/20 text-amber-400 border-amber-400/40",
    2: "bg-gray-300/15 text-gray-300 border-gray-300/30",
    3: "bg-orange-700/20 text-orange-400 border-orange-700/40",
  } as const;
  const labels = { 1: "1st", 2: "2nd", 3: "3rd" } as const;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${styles[rank]}`}>
      {labels[rank]}
    </span>
  );
}

function TeamRow({ team, score, won, pen, showPen, slot, side, emptyLabel, notStarted, rank }: { team?: Team | null; score: number; won: boolean; pen?: number | null; showPen?: boolean; slot?: string | null; side?: "team1" | "team2"; emptyLabel?: string | null; notStarted?: boolean; rank?: 1 | 2 | 3 | null }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${won ? "bg-white/5" : ""}`}>
      <span className={`flex items-center gap-2 min-w-0 text-[13px] ${won ? "font-bold text-white" : "text-gray-300"}`}>
        {team?.logo_url ? (
          <img src={team.logo_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
        ) : (
          <i className="fa-solid fa-shield-halved text-muted shrink-0"></i>
        )}
        <span className="truncate">{team ? team.short_name || team.name : emptyLabel || expectedLabel(slot, side) || "TBD"}</span>
        {won && <i className="fa-solid fa-check text-green-400 text-xs shrink-0"></i>}
        {rank && <RankBadge rank={rank} />}
        {showPen && <span className="text-[9px] font-bold bg-white/10 text-gray-300 px-1.5 py-0.5 rounded shrink-0">PEN</span>}
      </span>
      <span className={`font-display italic font-bold tabular-nums ${won ? "text-white" : "text-muted"}`}>
        {notStarted ? "–" : score}
        {showPen && pen !== null && pen !== undefined && (
          <span className="text-amber-400 text-sm"> ({pen})</span>
        )}
      </span>
    </div>
  );
}

function TeamRowOrCustom({
  custom,
  team,
  score,
  won,
  pen,
  showPen,
  slot,
  side,
  emptyLabel,
  notStarted,
  rank,
}: {
  custom?: React.ReactNode;
  team?: Team | null;
  score: number;
  won: boolean;
  pen?: number | null;
  showPen?: boolean;
  slot?: string | null;
  side?: "team1" | "team2";
  emptyLabel?: string | null;
  notStarted?: boolean;
  rank?: 1 | 2 | 3 | null;
}) {
  if (custom !== undefined) return <>{custom}</>;
  return <TeamRow team={team} score={score} won={won} pen={pen} showPen={showPen} slot={slot} side={side} emptyLabel={emptyLabel} notStarted={notStarted} rank={rank} />;
}

/** Peringkat sisi laga: F-1 → 1st/2nd, PO → 3rd untuk pemenang. */
export function sideRank(m: BracketMatch, side: "team1" | "team2"): 1 | 2 | 3 | null {
  const w = winnerOf(m);
  if (w === 0) return null;
  if (m.slot === "F-1") return (side === "team1" ? 1 : 2) === w ? (w as 1 | 2) : null;
  if (m.slot && m.slot.startsWith("PO-")) {
    return (side === "team1" ? 1 : 2) === w ? 3 : null;
  }
  return null;
}

export function isPoSlot(slot?: string | null): boolean {
  return !!slot && slot.startsWith("PO-");
}

/** Label sumber slot R16 bila tim belum terisi (cermin r16Sources backend). */
const R16_SOURCES: Record<string, { team1: [string, number]; team2: [string, number] }> = {
  "R16-1": { team1: ["A", 1], team2: ["B", 2] },
  "R16-2": { team1: ["C", 1], team2: ["D", 2] },
  "R16-3": { team1: ["E", 1], team2: ["F", 2] },
  "R16-4": { team1: ["G", 1], team2: ["H", 2] },
  "R16-5": { team1: ["H", 1], team2: ["G", 2] },
  "R16-6": { team1: ["F", 1], team2: ["E", 2] },
  "R16-7": { team1: ["D", 1], team2: ["C", 2] },
  "R16-8": { team1: ["B", 1], team2: ["A", 2] },
};

export function expectedLabel(slot?: string | null, side?: "team1" | "team2"): string | null {
  if (!slot || !side) return null;
  const src = R16_SOURCES[slot];
  if (!src) return null;
  const [group, pos] = src[side];
  return `${pos === 1 ? "WIN" : "RU"} Grup ${group}`;
}

/** 0 = belum ada pemenang, 1 = tim 1, 2 = tim 2 (termasuk via penalti). */
export function winnerOf(m: BracketMatch): 0 | 1 | 2 {
  if (m.status !== "finished") return 0;
  if (m.team1_score !== m.team2_score) return m.team1_score > m.team2_score ? 1 : 2;
  if (m.penalty1 != null && m.penalty2 != null && m.penalty1 !== m.penalty2) {
    return m.penalty1 > m.penalty2 ? 1 : 2;
  }
  return 0;
}

export function isPenaltyDecided(m: BracketMatch): boolean {
  return (
    m.status === "finished" &&
    m.team1_score === m.team2_score &&
    m.penalty1 != null &&
    m.penalty2 != null &&
    m.penalty1 !== m.penalty2
  );
}

/** Satu kartu laga: dipakai ronde utama maupun PO di bawah final. */
function MatchCard({
  m,
  all,
  renderTeamRow,
  renderCardFooter,
}: {
  m: BracketMatch;
  all: BracketMatch[];
  renderTeamRow?: (
    m: BracketMatch,
    side: "team1" | "team2",
    team: Team | null | undefined,
    score: number,
    won: boolean
  ) => React.ReactNode;
  renderCardFooter?: (m: BracketMatch) => React.ReactNode;
}) {
  const w = winnerOf(m);
  const decided = w !== 0;
  const pen = isPenaltyDecided(m);
  const feedLabel = (side: "team1" | "team2") => {
    const f = all.find((x) => x.winner_next_match_id === m.id && x.winner_next_side === side);
    if (f) return `Pemenang ${f.slot || `#${f.id}`}`;
    const l = all.find((x) => x.loser_next_match_id === m.id && x.loser_next_side === side);
    if (l) return `Kalah ${l.slot || `#${l.id}`}`;
    return null;
  };
  return (
                  <div
                    key={m.id}
                    data-mid={m.id}
                    data-decided={decided ? "1" : "0"}
                    className="relative z-10 bg-surface border border-border rounded-xl overflow-hidden"
                  >
                    <div className="px-3 py-1.5 border-b border-border flex items-center justify-between bg-dark/50">
                      <span className="text-[10px] font-bold text-muted uppercase">
                        {m.slot} • {m.lapangan}
                      </span>
                      {m.status === "live" && (
                        <span className="text-[10px] font-bold bg-brand px-2 py-0.5 rounded live-glow">LIVE</span>
                      )}
                      {m.is_walkover && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">WO</span>
                      )}
                      {m.status === "finished" && (
                        <span className="text-[10px] font-bold text-muted">FT</span>
                      )}
                    </div>
                    <TeamRowOrCustom
                      custom={renderTeamRow?.(m, "team1", m.team1, m.team1_score, w === 1)}
                      team={m.team1}
                      score={m.team1_score}
                      won={w === 1}
                      pen={m.penalty1}
                      showPen={pen}
                      slot={m.slot}
                      side="team1"
                      emptyLabel={feedLabel("team1")}
                      notStarted={m.status === "scheduled"}
                      rank={sideRank(m, "team1")}
                    />
                    <div className="border-t border-white/5" />
                    <TeamRowOrCustom
                      custom={renderTeamRow?.(m, "team2", m.team2, m.team2_score, w === 2)}
                      team={m.team2}
                      score={m.team2_score}
                      won={w === 2}
                      pen={m.penalty2}
                      showPen={pen}
                      slot={m.slot}
                      side="team2"
                      emptyLabel={feedLabel("team2")}
                      notStarted={m.status === "scheduled"}
                      rank={sideRank(m, "team2")}
                    />
                    {renderCardFooter?.(m)}
                    {m.status === "live" && m.clock_display && (
                      <div className="px-3 py-1 text-[10px] text-brand font-bold tabular-nums border-t border-white/5">
                        {m.period} • {m.clock_display}
                      </div>
                    )}
                  </div>
  );
}

export default function BracketDiagram({
  rounds,
  champion,
  third,
  renderTeamRow,
  renderCardFooter,
}: {
  rounds: BracketRound[];
  champion: Team | null;
  third?: Team | null;
  renderTeamRow?: (
    m: BracketMatch,
    side: "team1" | "team2",
    team: Team | null | undefined,
    score: number,
    won: boolean
  ) => React.ReactNode;
  renderCardFooter?: (m: BracketMatch) => React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    function draw() {
      const root = contentRef.current;
      if (!root) return;
      const rc = root.getBoundingClientRect();
      const els = new Map<number, HTMLElement>();
      root.querySelectorAll<HTMLElement>("[data-mid]").forEach((el) => {
        els.set(Number(el.dataset.mid), el);
      });

      const links: Array<[number, number | "champ"]> = [];
      rounds.forEach((r) =>
        r.matches.forEach((m) => {
          // PO-1 standalone: tanpa garis masuk/keluar.
          if (isPoSlot(m.slot)) return;
          if (m.winner_next_match_id) links.push([m.id, m.winner_next_match_id]);
        })
      );
      if (rounds.length > 0) {
        const all = rounds.flatMap((r) => r.matches);
        const final = all.find((x) => x.slot === "F-1") || [...rounds].sort((a, b) => b.order - a.order)[0]?.matches[0];
        if (final) links.push([final.id, "champ"]);
      }

      const out: Line[] = [];
      links.forEach(([from, to]) => {
        const a = els.get(from);
        const b = to === "champ" ? root.querySelector<HTMLElement>('[data-mid="champ"]') : els.get(to);
        if (!a || !b) return;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const x1 = ra.right - rc.left;
        const y1 = ra.top + ra.height / 2 - rc.top;
        const x2 = rb.left - rc.left;
        const y2 = rb.top + rb.height / 2 - rc.top;
        const midX = x1 + (x2 - x1) / 2;
        const hot = a.dataset.decided === "1";
        out.push({ d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`, hot });
      });

      setLines(out);
      setSize({ w: root.scrollWidth, h: root.scrollHeight });
    }

    draw();
    window.addEventListener("resize", draw);
    const t = setTimeout(draw, 400);
    return () => {
      window.removeEventListener("resize", draw);
      clearTimeout(t);
    };
  }, [rounds, champion]);

  const minH = Math.max(480, (rounds[0]?.matches.length || 0) * 150);

  return (
    <div className="overflow-x-auto pb-4">
      <div ref={contentRef} className="relative flex gap-14 w-max min-w-full" style={{ minHeight: minH }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size.w}
          height={size.h}
          aria-hidden
        >
          {lines.map((l, i) => (
            <path
              key={i}
              d={l.d}
              fill="none"
              stroke={l.hot ? "#DC2626" : "#3f3f46"}
              strokeWidth={2}
              opacity={l.hot ? 0.9 : 0.7}
            />
          ))}
        </svg>

        {(() => {
          const all = rounds.flatMap((rr) => rr.matches);
          const poMatches = all.filter((m) => isPoSlot(m.slot));
          const mainRounds = rounds
            .map((r) => ({ ...r, matches: r.matches.filter((m) => !isPoSlot(m.slot)) }))
            .filter((r) => r.matches.length > 0);
          return mainRounds.map((r) => {
            const isFinalCol = r.matches.some((m) => m.slot === "F-1");
            return (
          <div key={r.order} className="w-64 shrink-0 flex flex-col self-stretch">
            <h2 className="font-display italic font-bold text-lg uppercase mb-4 text-center shrink-0">
              <span className="text-brand">●</span> {r.label}
            </h2>
            <div className="flex-1 flex flex-col justify-around gap-6">
              {r.matches.map((m) => (
                <MatchCard key={m.id} m={m} all={all} renderTeamRow={renderTeamRow} renderCardFooter={renderCardFooter} />
              ))}
              {isFinalCol && poMatches.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-display italic font-bold text-sm uppercase mb-3 text-center shrink-0 text-muted">
                    Perebutan Juara 3
                  </h3>
                  <div className="flex flex-col gap-6">
                    {poMatches.map((m) => (
                      <MatchCard key={m.id} m={m} all={all} renderTeamRow={renderTeamRow} renderCardFooter={renderCardFooter} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          );
          });
        })()}

        {rounds.length > 0 && (() => {
          const all = rounds.flatMap((rr) => rr.matches);
          const final = all.find((x) => x.slot === "F-1");
          const fw = final ? winnerOf(final) : 0;
          const runnerUp = fw === 0 ? null : fw === 1 ? final!.team2 : final!.team1;
          return (
          <div className="w-64 shrink-0 flex flex-col self-stretch">
            <h2 className="font-display italic font-bold text-lg uppercase mb-4 text-center shrink-0">
              <span className="text-brand">●</span> Juara TSC Vol 5
            </h2>
            <div className="flex-1 flex flex-col justify-around gap-4">
              <div
                data-mid="champ"
                className="relative z-10 bg-gradient-to-r from-brand/20 to-transparent border border-brand/40 rounded-xl p-4 flex items-center gap-3"
              >
                {champion ? (
                  <>
                    <i className="fa-solid fa-trophy text-amber-400 text-2xl"></i>
                    <div>
                      <div className="text-[10px] font-bold text-amber-400 uppercase">1st • Juara 1</div>
                      <div className="font-display italic font-bold leading-tight">{champion.name}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-halved text-muted text-2xl"></i>
                    <div>
                      <div className="text-[10px] font-bold text-muted uppercase">1st • Juara 1</div>
                      <div className="font-display italic font-bold leading-tight text-muted">TBD</div>
                    </div>
                  </>
                )}
              </div>
              {runnerUp && (
                <div className="relative z-10 bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                  <i className="fa-solid fa-medal text-gray-300 text-2xl"></i>
                  <div>
                    <div className="text-[10px] font-bold text-gray-300 uppercase">2nd • Juara 2</div>
                    <div className="font-display italic font-bold leading-tight">{runnerUp.short_name || runnerUp.name}</div>
                  </div>
                </div>
              )}
              {third && (
                <div className="relative z-10 bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">🥉</span>
                  <div>
                    <div className="text-[10px] font-bold text-amber-600 uppercase">3rd • Juara 3</div>
                    <div className="font-display italic font-bold leading-tight">{third.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
