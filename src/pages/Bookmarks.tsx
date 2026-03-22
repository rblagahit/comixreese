import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark as BookmarkIcon, Search, Trash2, Play } from "lucide-react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface Bookmark {
  id: string;
  mangaId: string;
  title: string;
  coverUrl: string;
  author: string;
  createdAt: any;
}

export const Bookmarks: React.FC = () => {
  const { user, signIn } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    const bookmarksRef = collection(db, "users", user.uid, "bookmarks");
    const q = query(bookmarksRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bookmark[];
      setBookmarks(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/bookmarks`);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const removeBookmark = async (e: React.MouseEvent, mangaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "bookmarks", mangaId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/bookmarks/${mangaId}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <BookmarkIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Your Bookmarks</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Sign in to save your favorite manga and sync them across all your devices.
          </p>
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-emerald-700 transition-all"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Bookmarks</h1>
            <p className="text-gray-500 mt-1">You have {bookmarks.length} saved manga</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 text-emerald-600 font-semibold hover:underline"
          >
            <Search className="w-4 h-4" />
            Browse More
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              </div>
            ))}
          </div>
        ) : bookmarks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            <AnimatePresence>
              {bookmarks.map((bookmark) => (
                <motion.div
                  key={bookmark.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <Link to={`/manga/${bookmark.mangaId}`}>
                    <div className="aspect-[2/3] relative overflow-hidden">
                      <img
                        src={bookmark.coverUrl}
                        alt={bookmark.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <button
                          onClick={(e) => removeBookmark(e, bookmark.mangaId)}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                          title="Remove Bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Play className="w-4 h-4 fill-current" />
                          Continue Reading
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm">
                        {bookmark.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{bookmark.author}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookmarkIcon className="w-8 h-8" />
            </div>
            <p className="text-gray-400 mb-6">You haven't bookmarked any manga yet.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-emerald-700 transition-all"
            >
              <Search className="w-5 h-5" />
              Browse Manga
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
