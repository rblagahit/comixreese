import axios from "axios";

const API_BASE_URL = "/api/mangadex";
const IMAGE_BASE_URL = "/api/mangadex-images";

export interface Manga {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  author: string;
  status: string;
  year: number | null;
}

export interface Chapter {
  id: string;
  title: string;
  chapter: string;
  volume: string | null;
  publishAt: string;
  pages: string[];
  baseUrl: string;
  hash: string;
}

export const mangaDexService = {
  async searchManga(query: string, limit = 20): Promise<Manga[]> {
    const response = await axios.get(`${API_BASE_URL}/manga`, {
      params: {
        title: query,
        limit,
        includes: ["cover_art", "author"],
        contentRating: ["safe", "suggestive"],
      },
    });

    return response.data.data.map((manga: any) => this.transformManga(manga));
  },

  async getMangaDetails(id: string): Promise<Manga> {
    const response = await axios.get(`${API_BASE_URL}/manga/${id}`, {
      params: {
        includes: ["cover_art", "author"],
      },
    });

    return this.transformManga(response.data.data);
  },

  async getMangaChapters(id: string, offset = 0, limit = 100): Promise<Chapter[]> {
    const response = await axios.get(`${API_BASE_URL}/manga/${id}/feed`, {
      params: {
        limit,
        offset,
        translatedLanguage: ["en"],
        order: { chapter: "asc" },
        contentRating: ["safe", "suggestive"],
      },
    });

    return response.data.data.map((chapter: any) => ({
      id: chapter.id,
      title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`,
      chapter: chapter.attributes.chapter,
      volume: chapter.attributes.volume,
      publishAt: chapter.attributes.publishAt,
    }));
  },

  async getChapterPages(chapterId: string): Promise<{ baseUrl: string; hash: string; pages: string[] }> {
    const response = await axios.get(`${API_BASE_URL}/at-home/server/${chapterId}`);
    const { baseUrl, chapter } = response.data;
    return {
      baseUrl,
      hash: chapter.hash,
      pages: chapter.data,
    };
  },

  getPageUrl(baseUrl: string, hash: string, filename: string): string {
    // We proxy the image server through our backend
    // Original: https://uploads.mangadex.org/data/{hash}/{filename}
    // Proxy: /api/mangadex-images/data/{hash}/{filename}
    return `${IMAGE_BASE_URL}/data/${hash}/${filename}`;
  },

  transformManga(manga: any): Manga {
    const attributes = manga.attributes;
    const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0] || "Unknown Title";
    const description = attributes.description.en || attributes.description.ja || Object.values(attributes.description)[0] || "";
    
    const coverRel = manga.relationships.find((rel: any) => rel.type === "cover_art");
    const coverUrl = coverRel 
      ? `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes?.fileName || ""}` 
      : "https://via.placeholder.com/300x450?text=No+Cover";

    // Note: coverUrl above uses direct MangaDex uploads server. 
    // We might want to proxy this too if it has CORS issues.
    const proxiedCoverUrl = coverRel
      ? `${IMAGE_BASE_URL}/covers/${manga.id}/${coverRel.attributes?.fileName}`
      : "https://via.placeholder.com/300x450?text=No+Cover";

    const authorRel = manga.relationships.find((rel: any) => rel.type === "author");
    const author = authorRel?.attributes?.name || "Unknown Author";

    return {
      id: manga.id,
      title,
      description,
      coverUrl: proxiedCoverUrl,
      author,
      status: attributes.status,
      year: attributes.year,
    };
  },
};
