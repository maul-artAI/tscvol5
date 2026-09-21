export type TimelineRow = {
  minute: string;
  icon: "ball" | "yellow" | "red" | "foul";
  text: string;
  sub?: string;
  side: "team1" | "team2";
};

type Props = {
  lapangan: string;
  stage: string;
  headerLive: boolean;
  live?: boolean;
  team1Name: string[];
  team1Icon?: string;
  team1Color?: string;
  team1Logo?: string | null;
  team2Name: string[];
  team2Icon?: string;
  team2Color?: string;
  team2Logo?: string | null;
  team1Score: number;
  team2Score: number;
  clock: string;
  timeline: TimelineRow[];
};

function TimelineIcon({ icon }: { icon: TimelineRow["icon"] }) {
  if (icon === "ball") return <i className="fa-regular fa-futbol text-white"></i>;
  if (icon === "yellow") return <i className="fa-solid fa-square text-yellow-400"></i>;
  if (icon === "foul") return <i className="fa-solid fa-whistle text-gray-400"></i>;
  return <i className="fa-solid fa-square text-red-500"></i>;
}

function TeamBadge({ logo, icon, color }: { logo?: string | null; icon: string; color: string }) {
  if (logo) {
    return <img src={logo} alt="" className="w-12 h-12 mx-auto rounded-full object-cover bg-white/10 mb-2" />;
  }
  return (
    <div className="w-12 h-12 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-2">
      <i className={`fa-solid ${icon} text-2xl ${color}`}></i>
    </div>
  );
}

export default function LiveMatchCard({
  lapangan,
  stage,
  headerLive,
  live = true,
  team1Name,
  team1Icon = "fa-shield-halved",
  team1Color = "text-red-400",
  team1Logo,
  team2Name,
  team2Icon = "fa-shield",
  team2Color = "text-blue-400",
  team2Logo,
  team1Score,
  team2Score,
  clock,
  timeline,
}: Props) {
  const t1 = timeline.filter((t) => t.side === "team1");
  const t2 = timeline.filter((t) => t.side === "team2");

  return (
    <div className="bg-surface/80 backdrop-blur-sm border border-border rounded-xl overflow-hidden flex flex-col">
      <div className={`${headerLive ? "bg-brand/20 border-brand/30" : "bg-surface border-border"} border-b px-4 py-2 flex justify-between items-center`}>
        <span className={`text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase ${headerLive ? "bg-brand" : "bg-brand bg-red-800"}`}>{lapangan}</span>
        <span className="text-[10px] font-semibold text-gray-300 uppercase">{stage}</span>
      </div>
      <div className="p-4 flex-1">
        <div className="flex justify-between items-center mb-6">
          <div className="text-center w-1/3">
            <TeamBadge logo={team1Logo} icon={team1Icon} color={team1Color} />
            <div className="text-xs font-bold leading-tight">
              {team1Name[0]}<br />{team1Name[1]}
            </div>
          </div>
          <div className="text-center w-1/3 flex flex-col items-center">
            <div className="font-display text-5xl font-bold italic mb-1 flex items-center justify-center gap-2 tabular-nums">
              {team1Score} <span className="text-3xl text-border">-</span> {team2Score}
            </div>
            {live ? (
              <div className="bg-brand text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider mb-1 live-glow">Live</div>
            ) : (
              <div className="bg-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider mb-1">Upcoming</div>
            )}
            <div className="text-[10px] text-muted font-medium tabular-nums">{clock}</div>
          </div>
          <div className="text-center w-1/3">
            <TeamBadge logo={team2Logo} icon={team2Icon} color={team2Color} />
            <div className="text-xs font-bold leading-tight text-gray-300">
              {team2Name[0]}<br />{team2Name[1]}
            </div>
          </div>
        </div>
        {/* Timeline: kolom kiri Tim 1, kolom kanan Tim 2 (tidak campur) */}
        <div className="grid grid-cols-2 gap-x-4 border-t border-white/5 pt-3 text-[10px]">
          <div className="flex flex-col gap-y-2">
            {t1.map((t, i) => (
              <div key={`h${i}`} className="flex gap-2 text-gray-300">
                <span className="w-4 text-muted tabular-nums">{t.minute}</span>
                <TimelineIcon icon={t.icon} />
                <span>{t.text} {t.sub && <span className="text-muted">{t.sub}</span>}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-y-2">
            {t2.map((t, i) => (
              <div key={`a${i}`} className="flex gap-2 text-gray-300 justify-end flex-row-reverse">
                <span className="w-4 text-muted text-right tabular-nums">{t.minute}</span>
                <TimelineIcon icon={t.icon} />
                <span>{t.text} {t.sub && <span className="text-muted">{t.sub}</span>}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
