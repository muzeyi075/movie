import { notFound } from "next/navigation";
import Navigation from "@/components/navigation";
import WatchExperience from "@/components/watch-experience";
import { getCatalog } from "@/lib/catalog-store";

export default async function WatchPage({ params }) {
  const { movieId } = await params;
  const allMovies = await getCatalog();
  const movie = allMovies.find((item) => item.id === movieId);
  if (!movie) notFound();
  return <main className="app-shell"><Navigation/><section className="content watch-content"><WatchExperience movie={movie} related={allMovies.filter((item) => item.id !== movieId)} /></section></main>;
}
