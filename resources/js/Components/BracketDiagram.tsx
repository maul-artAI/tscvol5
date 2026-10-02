
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
  is_walkover?: boolean;
  penalty1?: number | null;
  penalty2?: number | null;
  is_penalty?: boolean;
};

export type BracketRound = { order: number; label: string; matches: BracketMatch[] };

type Line = { d: string; hot: boolean };

function TeamRow({ team, score, won, pen, showPen, slot, side, emptyLabel, notStarted }: { team?: Team | null; score: number; won: boolean; pen?: number | null; showPen?: boolean; slot?: string | null; side?: "team1" | "team2"; emptyLabel?: string | null; notStarted?: boolean }) {
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
}) {
  if (custom !== undefined) return <>{custom}</>;
  return <TeamRow team={team} score={score} won={won} pen={pen} showPen={showPen} slot={slot} side={side} emptyLabel={emptyLabel} notStarted={notStarted} />;
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

export default function BracketDiagram({
  rounds,
  champion,
  renderTeamRow,
  renderCardFooter,
}: {
  rounds: BracketRound[];
  champion: Team | null;
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
          if (m.winner_next_match_id) links.push([m.id, m.winner_next_match_id]);
        })
      );
      if (champion && rounds.length > 0) {
        const final = [...rounds].sort((a, b) => b.order - a.order)[0]?.matches[0];
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

        {rounds.map((r) => (
          <div key={r.order} className="w-64 shrink-0 flex flex-col self-stretch">
            <h2 className="font-display italic font-bold text-lg uppercase mb-4 text-center shrink-0">
              <span className="text-brand">●</span> {r.label}
            </h2>
            <div className="flex-1 flex flex-col justify-around gap-6">
              {r.matches.map((m) => {
                const w = winnerOf(m);
                const decided = w !== 0;
                const pen = isPenaltyDecided(m);
                const feeders = rounds.flatMap((rr) => rr.matches).filter((x) => x.winner_next_match_id === m.id);
                const feedLabel = (side: "team1" | "team2") => {
                  const f = feeders.find((x) => x.winner_next_side === side);
                  return f ? `Pemenang ${f.slot || `#${f.id}`}` : null;
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
                    />
                    {renderCardFooter?.(m)}
                    {m.status === "live" && m.clock_display && (
                      <div className="px-3 py-1 text-[10px] text-brand font-bold tabular-nums border-t border-white/5">
                        {m.period} • {m.clock_display}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {champion && (
          <div className="w-64 shrink-0 flex flex-col self-stretch">
            <h2 className="font-display italic font-bold text-lg uppercase mb-4 text-center shrink-0">
              <span className="text-brand">●</span> Juara
            </h2>
            <div className="flex-1 flex flex-col justify-around">
              <div
                data-mid="champ"
                className="relative z-10 bg-gradient-to-r from-brand/20 to-transparent border border-brand/40 rounded-xl p-4 flex items-center gap-3"
              >
                <i className="fa-solid fa-trophy text-brand text-2xl"></i>
                <div className="font-display italic font-bold leading-tight">{champion.name}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
