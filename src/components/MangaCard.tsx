import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Manga } from "../services/mangaDex";
import { motion } from "motion/react";

interface MangaCardProps {
  manga: Manga;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga }) => {
  const location = useLocation();
  const pathPrefix = location.pathname.startsWith("/comics") ? "/comics" : "/manga";

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <Link to={`${pathPrefix}/${manga.id}`}>
        <div className="aspect-[2/3] relative overflow-hidden">
          <img
            src={manga.coverUrl}
            alt={manga.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-white text-sm font-medium">View Details</span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm" title={manga.title}>
            {manga.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{manga.author}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">
              {manga.status}
            </span>
            {manga.year && (
              <span className="text-[10px] text-gray-400 font-medium">{manga.year}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
