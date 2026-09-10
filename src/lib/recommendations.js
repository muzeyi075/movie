export function getMovieAgeBoost(movie, now = Date.now()) {
  const rawDate = movie?.addedAt || movie?.createdAt;
  if (!rawDate) return 0;

  const timestamp = Date.parse(rawDate);
  if (Number.isNaN(timestamp)) return 0;

  const daysOld = (now - timestamp) / (1000 * 60 * 60 * 24);
  return Math.max(0, 30 - daysOld) * 8;
}

export function sortRecommendations(items) {
  return [...items].sort((a, b) => {
    const newnessDiff = getMovieAgeBoost(b) - getMovieAgeBoost(a);
    if (newnessDiff !== 0) return newnessDiff;

    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return Number(b.movie?.rating || b.rating || 0) - Number(a.movie?.rating || a.rating || 0);
  });
}
