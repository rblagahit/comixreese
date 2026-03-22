import React, { useState, useEffect } from "react";
import { mangaDexService, Manga } from "../services/mangaDex";
import { MangaCard } from "../components/MangaCard";
import { SearchBar } from "../components/SearchBar";
import { motion } from "motion/react";
import { TrendingUp, Clock, Star } from "lucide-react";

export const Home: React.FC = () => {
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchManga = async () => {
      setLoading(true);
      try {
        const results = await mangaDexService.searchManga(searchQuery || "one piece");
        setMangaList(results);
      } catch (error) {
        console.error("Error fetching manga:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchManga();
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 py-12 px-4 mb-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight"
          >
            Discover Your Next <span className="text-emerald-600">Adventure</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg mb-8 max-w-2xl mx-auto"
          >
            Explore thousands of manga titles from MangaDex. Read, track, and bookmark your favorites.
          </motion.p>
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Categories / Filters */}
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium shadow-sm hover:bg-emerald-700 transition-colors">
            <TrendingUp className="w-4 h-4" />
            Trending
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-100 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            <Clock className="w-4 h-4" />
            Latest Updates
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-100 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            <Star className="w-4 h-4" />
            Top Rated
          </button>
        </div>

        {/* Manga Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {mangaList.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        )}

        {!loading && mangaList.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No manga found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-emerald-600 font-medium hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
