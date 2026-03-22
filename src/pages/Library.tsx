import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Library as LibraryIcon, Search, Plus, TrendingUp } from "lucide-react";
import { comicService, ImportedComic } from "../services/comicService";
import { motion, AnimatePresence } from "motion/react";

export const Library: React.FC = () => {
  const [comics, setComics] = useState<ImportedComic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchComics = async () => {
      setLoading(true);
      try {
        const data = await comicService.getComics();
        if (data) setComics(data);
      } catch (error) {
        console.error("Error fetching library:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComics();
  }, []);

  const filteredComics = comics.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">Community Library</h1>
            <p className="text-gray-500">Manga imported and shared by the community.</p>
          </div>
          
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 rounded-2xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredComics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            <AnimatePresence>
              {filteredComics.map((comic) => (
                <motion.div
                  key={comic.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100"
                >
                  <Link to={`/manga/${comic.mangadexId}`}>
                    <div className="aspect-[2/3] relative overflow-hidden">
                      <img
                        src={comic.coverImage}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-xs font-bold uppercase tracking-wider">View Details</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 line-clamp-1 text-sm mb-1 group-hover:text-emerald-600 transition-colors">
                        {comic.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded">
                          {comic.status}
                        </span>
                        {comic.year && (
                          <span className="text-[10px] text-gray-400 font-medium">{comic.year}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white p-20 rounded-[3rem] border border-dashed border-gray-200 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <LibraryIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No comics found</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              The library is empty or your search didn't match any results. 
              Try importing some manga from the home page!
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-emerald-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Import Manga
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
