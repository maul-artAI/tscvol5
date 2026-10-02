
import { Link } from "@inertiajs/react";
import type { NewsItem } from "../../lib/api";
import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1518605368461-1e1e38ce7136?q=80&w=600&auto=format&fit=crop";

export default function BeritaPage({ items }: { items: NewsItem[] }) {
  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Berita <span className="text-brand">Turnamen</span>
        </h1>
        </Reveal>

        <Reveal delay={120}>

        {items.length === 0 ? (
          <p className="text-sm text-muted mt-6 bg-surface border border-border rounded-xl p-6 text-center">
            Belum ada berita.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {items.map((n) => (
              <Link
                key={n.id}
                href={`/berita/${n.slug}`}
                className="bg-surface border border-border rounded-xl flex flex-col hover:border-brand/50 transition group overflow-hidden"
              >
                <div className="h-40 overflow-hidden relative border-b border-border">
                  <img
                    src={n.cover_url || FALLBACK_IMG}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-700"
                    alt=""
                  />
                  <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide">
                    {n.category}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold leading-snug group-hover:text-brand transition">{n.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">{n.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        </Reveal>
      </div>
    </main>
    </PublicLayout>
  );
}
