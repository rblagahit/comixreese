import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Reader } from "../components/Reader";
import { ChevronLeft } from "lucide-react";
import { mangaDexService, Chapter } from "../services/mangaDex";

export const ChapterReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState<string | undefined>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapterInfo = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const chapterData = await mangaDexService.getChapterDetails(id);
        setChapterNumber(chapterData.chapterNumber);
        setMangaId(chapterData.comicId);

        if (chapterData.comicId) {
          const mangaChapters = await mangaDexService.getMangaChapters(chapterData.comicId);
          // Sort ascending for navigation logic (currentIndex + 1 = next chapter)
          const sortedChapters = [...mangaChapters].sort((a, b) => parseFloat(a.chapterNumber) - parseFloat(b.chapterNumber));
          setChapters(sortedChapters);
        }
      } catch (error) {
        console.error("Error fetching chapter info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapterInfo();
  }, [id]);

  const handleChapterChange = (direction: "prev" | "next") => {
    if (!id || chapters.length === 0) return;

    const currentIndex = chapters.findIndex((c) => c.id === id);
    if (currentIndex === -1) return;

    let nextChapter: Chapter | undefined;
    if (direction === "next") {
      nextChapter = chapters[currentIndex + 1];
    } else {
      nextChapter = chapters[currentIndex - 1];
    }

    if (nextChapter) {
      navigate(`/chapter/${nextChapter.id}`, { replace: true });
    }
  };

  if (!id) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-medium">Loading reader...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95 pb-20">
      {/* Reader Header */}
      <div className="sticky top-0 z-20 w-full px-4 py-4 bg-black/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <button
          onClick={() => navigate(mangaId ? `/manga/${mangaId}` : "/")}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
        >
          <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Back to Manga</span>
        </button>
        
        <div className="hidden md:block">
          <h1 className="text-white/60 text-sm font-medium tracking-wide uppercase">
            Chapter {chapterNumber}
          </h1>
        </div>
        
        <div className="w-24" /> {/* Spacer */}
      </div>

      <div className="pt-8">
        {mangaId && (
          <Reader 
            mangaId={mangaId} 
            chapterId={id} 
            chapterNumber={chapterNumber} 
            onChapterChange={handleChapterChange}
          />
        )}
      </div>
    </div>
  );
};
