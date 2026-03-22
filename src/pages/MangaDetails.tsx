import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { mangaDexService, Manga, Chapter } from "../services/mangaDex";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Play, Bookmark, Share2, Info, List, Check } from "lucide-react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

export const MangaDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, signIn } = useAuth();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chapters" | "info">("chapters");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [lastReadChapter, setLastReadChapter] = useState<{ id: string; chapter: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [mangaData, chaptersData] = await Promise.all([
          mangaDexService.getMangaDetails(id),
          mangaDexService.getMangaChapters(id),
        ]);
        setManga(mangaData);
        setChapters(chaptersData);
      } catch (error) {
        console.error("Error fetching manga details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!user || !id) {
      setIsBookmarked(false);
      setLastReadChapter(null);
      return;
    }

    const bookmarkRef = doc(db, "users", user.uid, "bookmarks", id);
    const progressRef = doc(db, "users", user.uid, "progress", id);

    const unsubBookmark = onSnapshot(bookmarkRef, (doc) => {
      setIsBookmarked(doc.exists());
    });

    const unsubProgress = onSnapshot(progressRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLastReadChapter({ id: data.chapterId, chapter: data.chapterNumber });
      }
    });

    return () => {
      unsubBookmark();
      unsubProgress();
    };
  }, [user, id]);

  const toggleBookmark = async () => {
    if (!user) {
      signIn();
      return;
    }

    if (!manga || !id) return;

    setBookmarkLoading(true);
    const bookmarkRef = doc(db, "users", user.uid, "bookmarks", id);

    try {
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, {
          uid: user.uid,
          mangaId: id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          author: manga.author,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/bookmarks/${id}`);
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading manga details...</p>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500 font-medium">Manga not found</p>
        <Link to="/" className="text-emerald-600 font-medium hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <img
          src={manga.coverUrl}
          alt={manga.title}
          className="w-full h-full object-cover blur-2xl scale-110 opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent" />
        
        <div className="absolute inset-0 flex items-end px-4 pb-12">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-8 items-center md:items-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-48 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white flex-shrink-0"
            >
              <img
                src={manga.coverUrl}
                alt={manga.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            <div className="flex-1 text-center md:text-left">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight"
              >
                {manga.title}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6"
              >
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase rounded-full">
                  {manga.status}
                </span>
                <span className="text-gray-500 font-medium">{manga.author}</span>
                {manga.year && <span className="text-gray-400 font-medium">• {manga.year}</span>}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center md:justify-start gap-4"
              >
                {lastReadChapter ? (
                  <Link
                    to={`/chapter/${lastReadChapter.id}`}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-emerald-700 transition-all hover:scale-105"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Continue Ch. {lastReadChapter.chapter}
                  </Link>
                ) : chapters.length > 0 ? (
                  <Link
                    to={`/chapter/${chapters[0].id}`}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-emerald-700 transition-all hover:scale-105"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Read First Chapter
                  </Link>
                ) : null}
                <button
                  onClick={toggleBookmark}
                  disabled={bookmarkLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
                    isBookmarked
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {isBookmarked ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </button>
                <button className="p-3 bg-white text-gray-700 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-wider transition-all relative ${
              activeTab === "chapters" ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <List className="w-4 h-4" />
            Chapters ({chapters.length})
            {activeTab === "chapters" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-wider transition-all relative ${
              activeTab === "info" ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Info className="w-4 h-4" />
            About
            {activeTab === "info" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "chapters" ? (
            <motion.div
              key="chapters"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-3"
            >
              {chapters.length > 0 ? (
                chapters.map((chapter) => (
                  <Link
                    key={chapter.id}
                    to={`/chapter/${chapter.id}`}
                    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-500/30 hover:bg-emerald-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-500 font-bold rounded-xl group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                        {chapter.chapter}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {chapter.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(chapter.publishAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </Link>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400">No chapters found for this manga.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {manga.description || "No description available."}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Author</h4>
                  <p className="text-gray-900 font-medium">{manga.author}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</h4>
                  <p className="text-gray-900 font-medium capitalize">{manga.status}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Year</h4>
                  <p className="text-gray-900 font-medium">{manga.year || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Language</h4>
                  <p className="text-gray-900 font-medium">English</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
