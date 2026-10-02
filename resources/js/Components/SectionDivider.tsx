const BALLS = [
    { size: "text-base", delay: "0ms" },
    { size: "text-xl", delay: "150ms" },
    { size: "text-base", delay: "300ms" },
];

export default function SectionDivider() {
    return (
        <div className="relative my-12 sm:my-14 flex items-center justify-center w-full max-w-7xl mx-auto px-4" aria-hidden="true">
            {/* Garis kiri memudar ke tengah */}
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neutral-700/60"></div>
            {/* Tiga bola futsal membal bergantian */}
            <div className="flex items-center gap-3 sm:gap-4 px-4">
                {BALLS.map((b, i) => (
                    <i
                        key={i}
                        className={`fa-solid fa-futbol text-white ${b.size} animate-bounce`}
                        style={{
                            animationDelay: b.delay,
                            filter: "drop-shadow(0 0 8px rgba(239,68,68,0.6))",
                        }}
                    ></i>
                ))}
            </div>
            {/* Garis kanan memudar dari tengah */}
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neutral-700/60"></div>
        </div>
    );
}
