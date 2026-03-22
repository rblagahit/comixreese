import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Settings } from "lucide-react";
import { mangaDexService } from "../services/mangaDex";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface ReaderProps {
  mangaId: string;
  chapterId: string;
  chapterNumber?: string;
  onChapterChange?: (direction: "prev" | "next") => void;
}

export const Reader: React.FC<ReaderProps> = ({ mangaId, chapterId, chapterNumber, onChapterChange }) => {
  const { user } = useAuth();
  const [pages, setPages] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [hash, setHash] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      setLoading(true);
      try {
        const data = await mangaDexService.getChapterPages(chapterId);
        setPages(data.pages);
        setBaseUrl(data.baseUrl);
        setHash(data.hash);
        setCurrentPage(0);
      } catch (error) {
        console.error("Error fetching pages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [chapterId]);

  // Track progress
  useEffect(() => {
    if (!user || !mangaId || !chapterId || loading) return;

    const updateProgress = async () => {
      const progressRef = doc(db, "users", user.uid, "progress", mangaId);
      try {
        await setDoc(progressRef, {
          uid: user.uid,
          mangaId,
          chapterId,
          chapterNumber: chapterNumber || null,
          pageNumber: currentPage,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/progress/${mangaId}`);
      }
    };

    const timeoutId = setTimeout(updateProgress, 2000); // Debounce updates
    return () => clearTimeout(timeoutId);
  }, [user, mangaId, chapterId, chapterNumber, currentPage, loading]);

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (onChapterChange) {
      onChapterChange("next");
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (onChapterChange) {
      onChapterChange("prev");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading chapter pages...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Controls Overlay */}
      <div className="sticky top-4 z-10 flex items-center justify-between w-full px-4 py-2 bg-black/80 backdrop-blur-md text-white rounded-2xl shadow-xl mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrev}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-sm font-medium">
            Page {currentPage + 1} of {pages.length}
          </span>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="w-full relative min-h-[80vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={`${chapterId}-${currentPage}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            src={mangaDexService.getPageUrl(baseUrl, hash, pages[currentPage])}
            alt={`Page ${currentPage + 1}`}
            className="max-w-full h-auto shadow-2xl rounded-lg"
            referrerPolicy="no-referrer"
            onClick={handleNext}
          />
        </AnimatePresence>
      </div>

      {/* Navigation Areas (Invisible) */}
      <div className="fixed inset-y-0 left-0 w-1/4 cursor-pointer z-0" onClick={handlePrev} />
      <div className="fixed inset-y-0 right-0 w-1/4 cursor-pointer z-0" onClick={handleNext} />

      {/* Bottom Progress */}
      <div className="w-full mt-8 mb-12 px-4">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
