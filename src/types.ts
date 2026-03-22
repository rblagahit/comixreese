export interface Comic {
  id: string; // MangaDex ID
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  altTitles: string[];
  tags: string[];
  status: "ongoing" | "completed" | "hiatus" | "cancelled";
  contentRating: "safe" | "suggestive" | "erotica" | "pornographic";
  year: number | null;
  lastChapterAt: string | null;
}

export interface Chapter {
  id: string; // mangadex_id
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
  cachedPath: string;
  fileSize?: number;
}

export interface Bookmark {
  id: string;
  uid: string;
  mangaId: string;
  title: string;
  coverUrl: string;
  author: string;
  createdAt: any;
}

export interface ReadingProgress {
  id: string;
  uid: string;
  mangaId: string;
  chapterId: string;
  chapterNumber: string | null;
  pageNumber: number;
  updatedAt: any;
}
