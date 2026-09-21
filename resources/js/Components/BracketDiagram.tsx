
import { useLayoutEffect, useRef, useState } from "react";
import type { Team } from "../lib/api";

export type BracketMatch = {
  id: number;
  slot?: string | null;
  lapangan?: string | null;
  status: string;
  team1_score: number;
  team2_score: number;
  period?: string | null;
  clock_display?: string | null;
  team1?: Team | null;
  team2?: Team | null;
  winner_next_match_id?: number | null;
  winner_next_side?: string | null;
};

export type BracketRound = { order: number; label: string; matches: BracketMatch[] };

type Line = { d: string; hot: boolean };

function TeamRow({ team, score, won }: { team?: Team | null; score: number; won: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${won ? "bg-white/5" : ""}`}>
      <span className={`flex items-center gap-2 min-w-0 text-[13px] ${won ? "font-bold text-white" : "text-gray-300"}`}>
        {team?.logo_url ? (
          <img src={team.logo_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
        ) : (
          <i className="fa-solid fa-shield-halved text-muted shrink-0"></i>
        )}
        <span className="truncate">{team ? team.short_name || team.name : "TBD"}</span>
        {won && <i className="fa-solid fa-check text-green-400 text-xs shrink-0"></i>}
      </span>
      <span className={`font-display italic font-bold tabular-nums ${won ? "text-white" : "text-muted"}`}>{score}</span>
    </div>
  );
}

function TeamRowOrCustom({
  custom,
  team,
  score,
  won,
}: {
  custom?: React.ReactNode;
  team?: Team | null;
  score: number;
  won: boolean;
}) {
  if (custom !== undefined) return <>{custom}</>;
  return <TeamRow team={team} score={score} won={won} />;
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
                const decided = m.status === "finished" && m.team1_score !== m.team2_score;
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
                      {m.status === "finished" && (
                        <span className="text-[10px] font-bold text-muted">FT</span>
                      )}
                    </div>
                    <TeamRowOrCustom
                      custom={renderTeamRow?.(m, "team1", m.team1, m.team1_score, decided && m.team1_score > m.team2_score)}
                      team={m.team1}
                      score={m.team1_score}
                      won={decided && m.team1_score > m.team2_score}
                    />
                    <div className="border-t border-white/5" />
                    <TeamRowOrCustom
                      custom={renderTeamRow?.(m, "team2", m.team2, m.team2_score, decided && m.team2_score > m.team1_score)}
                      team={m.team2}
                      score={m.team2_score}
                      won={decided && m.team2_score > m.team1_score}
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
