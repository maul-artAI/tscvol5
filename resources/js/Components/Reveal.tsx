import { useEffect, useRef, useState, type ReactNode } from "react";

type Variant = "up" | "right" | "scale" | "fade";

/**
 * Pembungkus animasi masuk: fade + geser/scale halus saat pertama tampil
 * (saat mount untuk hero, via IntersectionObserver untuk konten bawah).
 * Hormati prefers-reduced-motion (langsung tampil tanpa animasi).
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const v =
    variant === "right" ? "reveal-r" : variant === "scale" ? "reveal-scale" : variant === "fade" ? "" : "";
  return (
    <div
      ref={ref}
      className={`reveal ${v} ${shown ? "in" : ""} ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
