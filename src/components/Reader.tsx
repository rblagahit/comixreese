import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Settings, Zap, ZapOff, Layout, List } from "lucide-react";
import { mangaDexService, Page } from "../services/mangaDex";
import { comicService } from "../services/comicService";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../App";
import { useNavigate } from "react-router-dom";

interface ReaderProps {
  mangaId: string;
  chapterId: string;
  chapterNumber?: string;
  comicTitle?: string;
  onChapterChange?: (direction: "prev" | "next") => void;
}

export const Reader: React.FC<ReaderProps> = ({ 
  mangaId, 
  chapterId, 
  chapterNumber, 
  comicTitle,
  onChapterChange 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">(() => {
    return (localStorage.getItem("readingMode") as "vertical" | "horizontal") || 
           (import.meta.env.VITE_READER_DEFAULT_MODE as "vertical" | "horizontal") || 
           "vertical";
  });
  const [useDataSaver, setUseDataSaver] = useState(() => {
    const stored = localStorage.getItem("useDataSaver");
    if (stored !== null) return stored === "true";
    return import.meta.env.VITE_READER_DATA_SAVER === "true";
  });

  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const verticalContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Auto-hide UI logic
  const resetUITimeout = useCallback(() => {
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    setShowUI(true);
    uiTimeoutRef.current = setTimeout(() => {
      setShowUI(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetUITimeout();
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUITimeout]);

  useEffect(() => {
    localStorage.setItem("useDataSaver", String(useDataSaver));
  }, [useDataSaver]);

  useEffect(() => {
    localStorage.setItem("readingMode", readingMode);
  }, [readingMode]);

  // Fetch pages and initial progress
  useEffect(() => {
    const fetchPages = async () => {
      setLoading(true);
      try {
        const data = await mangaDexService.getChapterPages(chapterId);
        setPages(data.pages);

        // Resume progress
        const progress = await comicService.getProgress(mangaId);
        if (progress && progress.chapterId === chapterId) {
          setCurrentPage(progress.pageNumber);
          if (readingMode === "vertical") {
            // We'll scroll to the page after the images are rendered
          }
        } else {
          setCurrentPage(0);
        }
      } catch (error) {
        console.error("Error fetching pages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [chapterId, mangaId, readingMode]);

  // Initial scroll for vertical mode
  useEffect(() => {
    if (!loading && readingMode === "vertical" && currentPage > 0) {
      const timer = setTimeout(() => {
        const target = verticalContainerRef.current?.querySelector(`[data-page-index="${currentPage}"]`);
        target?.scrollIntoView({ behavior: "auto", block: "start" });
      }, 500); // Give some time for images to start rendering
      return () => clearTimeout(timer);
    }
  }, [loading, readingMode]);

  // Save progress and pre-cache
  useEffect(() => {
    if (loading || pages.length === 0) return;
    
    comicService.updateProgress(mangaId, chapterId, chapterNumber || "0", currentPage);
    
    // Pre-cache next N pages
    const preloadCount = parseInt(import.meta.env.VITE_READER_PRELOAD || "3");
    if (currentPage < pages.length - 1) {
      comicService.preCachePages(mangaId, chapterId, currentPage + 1, currentPage + preloadCount);
    }
  }, [currentPage, mangaId, chapterId, chapterNumber, loading, pages.length]);

  // Handle vertical scroll to update current page
  const handleVerticalScroll = useCallback(() => {
    if (readingMode !== "vertical" || !verticalContainerRef.current) return;

    const container = verticalContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const center = scrollTop + containerHeight / 2;

    const pageElements = container.querySelectorAll("[data-page-index]");
    let currentIdx = 0;
    let minDistance = Infinity;

    pageElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const elCenter = htmlEl.offsetTop + htmlEl.offsetHeight / 2;
      const distance = Math.abs(center - elCenter);

      if (distance < minDistance) {
        minDistance = distance;
        currentIdx = parseInt(htmlEl.dataset.pageIndex || "0");
      }
    });

    if (currentIdx !== currentPage) {
      setCurrentPage(currentIdx);
    }
    
    // Show UI on scroll up, hide on scroll down
    if (scrollTop < lastScrollTop.current) {
      setShowUI(true);
    }
    lastScrollTop.current = scrollTop;
  }, [readingMode, currentPage]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentPage < pages.length - 1) {
      const nextIdx = currentPage + 1;
      setCurrentPage(nextIdx);
      if (readingMode === "vertical") {
        const target = verticalContainerRef.current?.querySelector(`[data-page-index="${nextIdx}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (onChapterChange) {
      onChapterChange("next");
    }
  }, [currentPage, pages.length, readingMode, onChapterChange]);

  const handlePrev = useCallback(() => {
    if (currentPage > 0) {
      const prevIdx = currentPage - 1;
      setCurrentPage(prevIdx);
      if (readingMode === "vertical") {
        const target = verticalContainerRef.current?.querySelector(`[data-page-index="${prevIdx}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (onChapterChange) {
      onChapterChange("prev");
    }
  }, [currentPage, readingMode, onChapterChange]);

  const goToPage = (idx: number) => {
    setCurrentPage(idx);
    if (readingMode === "vertical") {
      const target = verticalContainerRef.current?.querySelector(`[data-page-index="${idx}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    resetUITimeout();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setShowUI(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

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
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Summoning pages...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 text-white overflow-hidden select-none">
      {/* Top Bar */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-white/5 px-4 py-3"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate(`/manga/${mangaId}`)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                  <h1 className="font-bold text-sm truncate max-w-[150px] md:max-w-md">{comicTitle || "Manga"}</h1>
                  <span className="text-xs text-gray-400">Chapter {chapterNumber}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <button
                  onClick={() => setUseDataSaver(!useDataSaver)}
                  className={`p-2 rounded-xl transition-colors ${useDataSaver ? "bg-emerald-500 text-white" : "hover:bg-white/10 text-white/60"}`}
                  title="Data Saver"
                >
                  {useDataSaver ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setReadingMode(readingMode === "vertical" ? "horizontal" : "vertical")}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60"
                  title="Reading Mode"
                >
                  {readingMode === "vertical" ? <Layout className="w-5 h-5" /> : <List className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hidden md:block"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={false}
                animate={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Area */}
      <div 
        className="h-full w-full relative"
        onClick={(e) => {
          // Only toggle UI if clicking in the middle 1/3
          const width = window.innerWidth;
          const x = e.clientX;
          if (x > width / 3 && x < (width * 2) / 3) {
            setShowUI(!showUI);
          }
        }}
      >
        {readingMode === "vertical" ? (
          <div 
            ref={verticalContainerRef}
            onScroll={handleVerticalScroll}
            className="h-full overflow-y-auto scroll-smooth snap-y snap-mandatory"
          >
            <div className="flex flex-col items-center py-20">
              {pages.map((page, idx) => (
                <div 
                  key={page.filename}
                  data-page-index={idx}
                  className="w-full flex justify-center py-1 snap-center min-h-[50vh]"
                >
                  <img 
                    src={mangaDexService.getPageUrl(page, useDataSaver)}
                    alt={`Page ${idx + 1}`}
                    className="max-w-full md:max-w-3xl h-auto shadow-2xl"
                    loading={idx < currentPage + 3 ? "eager" : "lazy"}
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
              
              {/* Chapter End Navigation */}
              <div className="py-20 flex flex-col items-center gap-6">
                <h2 className="text-2xl font-bold text-gray-400">End of Chapter</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => onChapterChange?.("prev")}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors font-medium"
                  >
                    Previous Chapter
                  </button>
                  <button 
                    onClick={() => onChapterChange?.("next")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl transition-colors font-bold"
                  >
                    Next Chapter
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${chapterId}-${currentPage}-${useDataSaver}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="relative max-w-full max-h-full flex items-center justify-center"
              >
                <img 
                  src={mangaDexService.getPageUrl(pages[currentPage], useDataSaver)}
                  alt={`Page ${currentPage + 1}`}
                  className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </AnimatePresence>

            {/* Horizontal Navigation Zones */}
            <div 
              className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-0" 
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }} 
            />
            <div 
              className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-0" 
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }} 
            />
          </div>
        )}
      </div>

      {/* Bottom Slider Bar */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-white/5 p-6"
          >
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Page {currentPage + 1}</span>
                <span>{pages.length} Pages</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={pages.length - 1} 
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={handlePrev}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="text-sm font-bold bg-white/10 px-4 py-1 rounded-full">
                  {currentPage + 1} / {pages.length}
                </span>
                <button 
                  onClick={handleNext}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
