import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Reader } from "../components/Reader";
import { ChevronLeft } from "lucide-react";
import { mangaDexService, Chapter } from "../services/mangaDex";

export const ChapterReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [comicTitle, setComicTitle] = useState<string | undefined>();
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

          // Fetch comic details for title
          const comic = await mangaDexService.getMangaDetails(chapterData.comicId);
          setComicTitle(comic.title);
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
      const pathPrefix = location.pathname.startsWith("/read/") ? "/read" : "/chapter";
      navigate(`${pathPrefix}/${nextChapter.id}`, { replace: true });
    }
  };

  if (!id) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-medium animate-pulse">Entering the reader...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {mangaId && (
        <Reader 
          mangaId={mangaId} 
          chapterId={id} 
          chapterNumber={chapterNumber} 
          comicTitle={comicTitle}
          onChapterChange={handleChapterChange}
        />
      )}
    </div>
  );
};
