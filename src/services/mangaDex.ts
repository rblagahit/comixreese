import axios from "axios";

const API_BASE_URL = "/api/mangadex";
const IMAGE_BASE_URL = "/image";

export interface Manga {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  author: string;
  artist: string;
  status: string;
  year: number | null;
  contentRating: string;
  tags: string[];
  altTitles: string[];
}

export interface Chapter {
  id: string;
  comicId: string;
  chapterNumber: string;
  title: string;
  pagesCount: number;
  volumeNumber: number | null;
  language: string;
  publishedAt: string;
  scanStatus: "ready" | "pending" | "error";
}

export interface Page {
  chapterId: string;
  pageNumber: number;
  filename: string;
  hash: string;
  baseUrl: string;
  originalUrl: string;
  dataSaverUrl: string;
  cachedPath: string;
  fileSize?: number;
}

export const mangaDexService = {
  async searchManga(filters: {
    query?: string;
    status?: string[];
    contentRating?: string[];
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<Manga[]> {
    const response = await axios.get(`${API_BASE_URL}/manga`, {
      params: {
        title: filters.query,
        status: filters.status,
        contentRating: filters.contentRating || ["safe", "suggestive"],
        includedTags: filters.tags,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        order: { updatedAt: "desc" },
        includes: ["cover_art", "author", "artist"],
      },
    });

    return response.data.data.map((manga: any) => this.transformManga(manga));
  },

  async getPopularManga(limit = 20, safeOnly = true): Promise<Manga[]> {
    const contentRating = safeOnly ? ["safe"] : ["safe", "suggestive", "erotica"];
    const response = await axios.get(`${API_BASE_URL}/manga`, {
      params: {
        limit,
        includes: ["cover_art", "author", "artist"],
        contentRating,
        order: { followedCount: "desc" },
      },
    });

    return response.data.data.map((manga: any) => this.transformManga(manga));
  },

  async getMangaDetails(id: string): Promise<Manga> {
    const response = await axios.get(`${API_BASE_URL}/manga/${id}`, {
      params: {
        includes: ["cover_art", "author", "artist", "tag"],
      },
    });

    return this.transformManga(response.data.data);
  },

  async getMangaChapters(id: string, language = "en", limit = 100, offset = 0): Promise<Chapter[]> {
    const response = await axios.get(`${API_BASE_URL}/chapter`, {
      params: {
        manga: id,
        limit,
        offset,
        translatedLanguage: [language],
        order: { chapter: "desc" },
        contentRating: ["safe", "suggestive", "erotica"],
        includes: ["scanlation_group", "manga"],
      },
    });

    return response.data.data.map((chapter: any) => this.transformChapter(chapter));
  },

  async getMangaFeed(mangaIds: string[], language = "en", limit = 100): Promise<Chapter[]> {
    if (mangaIds.length === 0) return [];
    
    const response = await axios.get(`${API_BASE_URL}/chapter`, {
      params: {
        manga: mangaIds,
        translatedLanguage: [language],
        order: { readableAt: "desc" },
        limit,
        includes: ["scanlation_group", "manga"],
      },
    });

    return response.data.data.map((chapter: any) => this.transformChapter(chapter));
  },

  async getChapterDetails(chapterId: string): Promise<Chapter> {
    const response = await axios.get(`${API_BASE_URL}/chapter/${chapterId}`, {
      params: {
        includes: ["manga"],
      },
    });
    return this.transformChapter(response.data.data);
  },

  transformChapter(chapter: any): Chapter {
    const attributes = chapter.attributes;
    const mangaRel = chapter.relationships.find((rel: any) => rel.type === "manga");
    
    return {
      id: chapter.id,
      comicId: mangaRel?.id || "",
      chapterNumber: attributes.chapter,
      title: attributes.title || `Chapter ${attributes.chapter}`,
      pagesCount: attributes.pages,
      volumeNumber: attributes.volume ? parseInt(attributes.volume) : null,
      language: attributes.translatedLanguage,
      publishedAt: attributes.publishAt,
      scanStatus: "ready", // MangaDex chapters are usually ready if they are in the feed
    };
  },

  async getChapterPages(chapterId: string): Promise<{ baseUrl: string; hash: string; pages: Page[] }> {
    const response = await axios.get(`${API_BASE_URL}/at-home/server/${chapterId}`);
    const { baseUrl, chapter } = response.data;
    
    const pages: Page[] = chapter.data.map((filename: string, index: number) => ({
      chapterId,
      pageNumber: index + 1,
      filename,
      hash: chapter.hash,
      baseUrl,
      originalUrl: `${baseUrl}/data/${chapter.hash}/${filename}`,
      dataSaverUrl: `${baseUrl}/data-saver/${chapter.hash}/${filename}`,
      cachedPath: `/data/${chapter.hash}/${filename}`,
    }));

    return {
      baseUrl,
      hash: chapter.hash,
      pages,
    };
  },

  getCoverUrl(mangaId: string, filename: string): string {
    return `${IMAGE_BASE_URL}/covers/${mangaId}/${filename}`;
  },

  getPageUrl(page: Page, useDataSaver = false): string {
    if (useDataSaver) {
      // We don't have a proxy for data-saver yet in server.ts, 
      // but we can add it or use direct URL if CORS allows.
      // For now, let's stick to the proxy path if possible.
      return `${IMAGE_BASE_URL}/data-saver/${page.hash}/${page.filename}`;
    }
    return `${IMAGE_BASE_URL}${page.cachedPath}`;
  },

  transformManga(manga: any): Manga {
    const attributes = manga.attributes;
    const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0] || "Unknown Title";
    const description = attributes.description.en || attributes.description.ja || Object.values(attributes.description)[0] || "";
    
    const coverRel = manga.relationships?.find((rel: any) => rel.type === "cover_art");
    const proxiedCoverUrl = coverRel
      ? `${IMAGE_BASE_URL}/covers/${manga.id}/${coverRel.attributes?.fileName}`
      : "https://via.placeholder.com/300x450?text=No+Cover";

    const authorRel = manga.relationships?.find((rel: any) => rel.type === "author");
    const author = authorRel?.attributes?.name || "Unknown Author";

    const artistRel = manga.relationships?.find((rel: any) => rel.type === "artist");
    const artist = artistRel?.attributes?.name || author;

    const tags = attributes.tags?.map((tag: any) => tag.attributes.name.en) || [];
    const altTitles = attributes.altTitles?.map((alt: any) => Object.values(alt)[0]) || [];

    return {
      id: manga.id,
      title,
      description,
      coverUrl: proxiedCoverUrl,
      author,
      artist,
      status: attributes.status,
      year: attributes.year,
      contentRating: attributes.contentRating,
      tags,
      altTitles,
    };
  },
};
