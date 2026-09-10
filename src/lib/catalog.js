export const movies = [
  { id: "dune-two", title: "Dune: Part Two", genre: "Sci-Fi \u00b7 Adventure", categories: ["Sci-Fi", "Adventure"], rating: "8.7", year: "2024", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80" },
  { id: "fall-guy", title: "The Fall Guy", genre: "Action \u00b7 Comedy", categories: ["Action", "Comedy"], rating: "7.9", year: "2024", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80" },
  { id: "furiosa", title: "Furiosa", genre: "Action \u00b7 Thriller", categories: ["Action", "Thriller"], rating: "8.2", year: "2024", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80" },
  { id: "challengers", title: "Challengers", genre: "Drama \u00b7 Romance", categories: ["Drama", "Romance"], rating: "7.5", year: "2024", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80" },
  { id: "kingdom", title: "Kingdom", genre: "Drama \u00b7 Adventure", categories: ["Drama", "Adventure"], rating: "8.1", year: "2024", image: "https://images.unsplash.com/photo-1525088553748-01d6e210e00b?auto=format&fit=crop&w=700&q=80" },
];

export const trending = [
  { id: "last-horizon", title: "The Last Horizon", category: "Sci-Fi \u00b7 2024", categories: ["Sci-Fi"], image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=80" },
  { id: "dark-matter", title: "Dark Matter", category: "Mystery \u00b7 2024", categories: ["Mystery", "Thriller"], image: "https://images.unsplash.com/photo-1519608487953-e999c86e7453?auto=format&fit=crop&w=700&q=80" },
  { id: "wild-hearts", title: "Wild Hearts", category: "Adventure \u00b7 2024", categories: ["Adventure", "Romance"], image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=700&q=80" },
];

export const allMovies = [...movies, ...trending];
