import { getCatalog } from "@/lib/catalog-store";
import { getHistory } from "@/lib/history-store";
import { getWatchlist } from "@/lib/watchlist-store";
import { authenticateRequest, getUserId } from "@/lib/auth";
import { sortRecommendations } from "@/lib/recommendations";

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  const uid = getUserId(decoded);
  const [catalog, history, watchlist] = await Promise.all([getCatalog(), uid ? getHistory(uid) : [], uid ? getWatchlist(uid) : []]);
  const interests = new Map();
  const watchedIds = new Set(history.map((entry) => entry.movieId));
  const addInterest = (movieId, weight) => {
    const movie = catalog.find((item) => item.id === movieId);
    movie?.categories?.forEach((category) => interests.set(category, (interests.get(category) || 0) + weight));
  };
  history.forEach((entry) => addInterest(entry.movieId, entry.progress >= 80 ? 4 : 2));
  watchlist.forEach((movieId) => addInterest(movieId, 1));
  const movies = sortRecommendations(catalog.filter((movie) => !watchedIds.has(movie.id)).map((movie) => {
    const matched = (movie.categories || []).map((category) => ({ category, score: interests.get(category) || 0 })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
    return { movie, score: matched.reduce((total, entry) => total + entry.score, 0) + Number(movie.rating || 0) / 10, reason: matched.length ? `Because you enjoy ${matched[0].category}` : "Popular in the Cinemora library" };
  })).slice(0, 12).map(({ movie, reason }) => ({ ...movie, recommendationReason: reason }));
  return Response.json({ movies, personalized: uid ? interests.size > 0 : false });
}
