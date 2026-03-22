import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Reader } from "../components/Reader";
import { ChevronLeft } from "lucide-react";
import axios from "axios";

export const ChapterReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapterInfo = async () => {
      if (!id) return;
      try {
        const response = await axios.get(`/api/mangadex/chapter/${id}`);
        const data = response.data.data;
        setChapterNumber(data.attributes.chapter);
        const mangaRel = data.relationships.find((rel: any) => rel.type === "manga");
        if (mangaRel) {
          setMangaId(mangaRel.id);
        }
      } catch (error) {
        console.error("Error fetching chapter info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapterInfo();
  }, [id]);

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
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
        >
          <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Back to Manga</span>
        </button>
        
        <div className="hidden md:block">
          <h1 className="text-white/60 text-sm font-medium tracking-wide uppercase">
            Chapter Reader
          </h1>
        </div>
        
        <div className="w-24" /> {/* Spacer */}
      </div>

      <div className="pt-8">
        {mangaId && <Reader mangaId={mangaId} chapterId={id} chapterNumber={chapterNumber} />}
      </div>
    </div>
  );
};
