
import BackButton from "../../Components/BackButton";
import PublicLayout from "../../Layouts/PublicLayout";
import type { NewsItem } from "../../lib/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function BeritaDetailPage({ item }: { item: NewsItem }) {
  const d = item.published_at ? new Date(item.published_at) : null;

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <article className="max-w-[760px] mx-auto px-4 sm:px-6 py-8">
        <BackButton href="/berita" label="Semua berita" />
        <div className="flex items-center gap-2 mt-4 mb-3">
          <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide">
            {item.category}
          </span>
          {d && !isNaN(+d) && (
            <span className="text-xs text-muted">
              {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}
            </span>
          )}
        </div>
        <h1 className="font-display italic font-bold text-3xl md:text-4xl leading-tight">{item.title}</h1>
        {item.excerpt && <p className="text-gray-400 mt-3 leading-relaxed">{item.excerpt}</p>}
        {item.cover_url && (
          <img src={item.cover_url} alt="" className="w-full rounded-xl mt-6 object-cover max-h-[420px]" />
        )}
        {item.body && (
          <div
            className="rich-body mt-6 text-[15px] leading-[1.8] text-gray-200"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
        )}
      </article>
    </main>
    </PublicLayout>
  );
}
