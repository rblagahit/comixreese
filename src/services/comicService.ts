import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { mangaDexService, Manga } from './mangaDex';

export interface ImportedComic {
  id: string;
  mangadexId: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  altTitles: string[];
  tags: string[];
  status: string;
  contentRating: string;
  year: number | null;
  lastChapterAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface Chapter {
  id: string;
  mangadexId: string;
  comicId: string;
  chapterNumber: string;
  title: string;
  volumeNumber: number | null;
  language: string;
  publishedAt: Timestamp;
  scanStatus: string;
}

export interface Bookmark {
  id: string;
  uid: string;
  mangaId: string;
  title: string;
  coverUrl: string;
  author: string;
  createdAt: Timestamp;
}

export interface ReadingProgress {
  uid: string;
  mangaId: string;
  chapterId: string;
  chapterNumber: string;
  pageNumber: number;
  updatedAt: Timestamp;
}

export const comicService = {
  async getComics(filters: { search?: string; status?: string; tag?: string; limitCount?: number } = {}) {
    const path = 'comics';
    try {
      let q = query(collection(db, path), orderBy('createdAt', 'desc'));

      if (filters.limitCount) {
        q = query(q, limit(filters.limitCount));
      }

      const snapshot = await getDocs(q);
      let comics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportedComic));

      // Client-side filtering for search and tags if needed, 
      // though Firestore supports some of this with indexes.
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        comics = comics.filter(c => c.title.toLowerCase().includes(searchLower));
      }
      if (filters.status) {
        comics = comics.filter(c => c.status === filters.status);
      }
      if (filters.tag) {
        comics = comics.filter(c => c.tags.includes(filters.tag!));
      }

      return comics;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getComic(id: string) {
    const path = `comics/${id}`;
    try {
      const docRef = doc(db, 'comics', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ImportedComic;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async importComic(mangadexId: string) {
    const path = 'comics';
    try {
      // Check if already imported
      const q = query(collection(db, path), where('mangadexId', '==', mangadexId));
      const existing = await getDocs(q);
      if (!existing.empty) {
        return { id: existing.docs[0].id, ...existing.docs[0].data() } as ImportedComic;
      }

      const mangaData = await mangaDexService.getMangaDetails(mangadexId);
      if (!mangaData) throw new Error('Could not fetch manga from MangaDex');

      const slug = mangaData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + mangadexId.substring(0, 8);
      
      const comicData = {
        mangadexId: mangaData.id,
        title: mangaData.title,
        slug,
        description: mangaData.description,
        coverImage: mangaData.coverUrl,
        altTitles: mangaData.altTitles,
        tags: mangaData.tags,
        status: mangaData.status,
        contentRating: mangaData.contentRating,
        year: mangaData.year,
        lastChapterAt: null,
        createdAt: serverTimestamp(),
      };

      const docRef = doc(collection(db, path));
      await setDoc(docRef, comicData);
      
      // Fetch and store chapters
      await this.fetchChapters(docRef.id, mangaData.id);
      
      return { id: docRef.id, ...comicData } as unknown as ImportedComic;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async fetchChapters(comicId: string, mangadexId: string) {
    const path = `comics/${comicId}/chapters`;
    try {
      let offset = 0;
      const limitCount = 100;
      let hasMore = true;
      let latestChapterDate: Date | null = null;

      while (hasMore) {
        const chapters = await mangaDexService.getMangaChapters(mangadexId, 'en', limitCount, offset);
        
        if (chapters.length === 0) {
          hasMore = false;
          break;
        }

        for (const chapter of chapters) {
          const chapterPath = `comics/${comicId}/chapters/${chapter.id}`;
          const chapterDocRef = doc(db, 'comics', comicId, 'chapters', chapter.id);
          
          const publishedAt = new Date(chapter.publishedAt);
          if (!latestChapterDate || publishedAt > latestChapterDate) {
            latestChapterDate = publishedAt;
          }

          await setDoc(chapterDocRef, {
            mangadexId: chapter.id,
            comicId: comicId,
            chapterNumber: chapter.chapterNumber || '0',
            title: chapter.title || '',
            volumeNumber: chapter.volumeNumber,
            language: chapter.language,
            publishedAt: Timestamp.fromDate(publishedAt),
            scanStatus: 'pending',
          }, { merge: true });
        }

        offset += limitCount;
        if (chapters.length < limitCount) {
          hasMore = false;
        }
      }

      // Update comic's last chapter timestamp
      if (latestChapterDate) {
        const comicRef = doc(db, 'comics', comicId);
        await updateDoc(comicRef, {
          lastChapterAt: Timestamp.fromDate(latestChapterDate)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async toggleBookmark(manga: Manga) {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/bookmarks/${manga.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'bookmarks', manga.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await deleteDoc(docRef);
        return false; // Unbookmarked
      } else {
        await setDoc(docRef, {
          uid: userId,
          mangaId: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          author: manga.author,
          createdAt: serverTimestamp(),
        });
        return true; // Bookmarked
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getBookmarks() {
    if (!auth.currentUser) return [];
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/bookmarks`;
    try {
      const q = query(collection(db, 'users', userId, 'bookmarks'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmark));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateProgress(mangaId: string, chapterId: string, chapterNumber: string, pageNumber: number) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/progress/${mangaId}`;
    try {
      const docRef = doc(db, 'users', userId, 'progress', mangaId);
      await setDoc(docRef, {
        uid: userId,
        mangaId,
        chapterId,
        chapterNumber,
        pageNumber,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getProgress(mangaId: string) {
    if (!auth.currentUser) return null;
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/progress/${mangaId}`;
    try {
      const docRef = doc(db, 'users', userId, 'progress', mangaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as ReadingProgress;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
};
