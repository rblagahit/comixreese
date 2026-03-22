/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { MangaDetails } from "./pages/MangaDetails";
import { ChapterReader } from "./pages/ChapterReader";
import { Bookmarks } from "./pages/Bookmarks";
import { Search, Bookmark, Home as HomeIcon, User, Menu, X, LogOut } from "lucide-react";
import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, db, OperationType, handleFirestoreError } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// Auth Context
interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user profile to Firestore
        const userRef = doc(db, "users", user.uid);
        try {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function Navigation() {
  const location = useLocation();
  const { user, signIn, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Don't show nav in reader
  if (location.pathname.startsWith("/chapter/")) return null;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Comix<span className="text-emerald-600">Reese</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                isActive("/") ? "text-emerald-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              Home
            </Link>
            <Link
              to="/bookmarks"
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                isActive("/bookmarks") ? "text-emerald-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Bookmarks
            </Link>
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pr-3 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={user.photoURL || ""}
                    alt={user.displayName || ""}
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-semibold text-gray-700">{user.displayName?.split(" ")[0]}</span>
                </button>
                
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2"
                    >
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-24 px-4 md:hidden"
          >
            <div className="flex flex-col gap-6">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 text-2xl font-bold text-gray-900"
              >
                <HomeIcon className="w-6 h-6 text-emerald-600" />
                Home
              </Link>
              <Link
                to="/bookmarks"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 text-2xl font-bold text-gray-900"
              >
                <Bookmark className="w-6 h-6 text-emerald-600" />
                Bookmarks
              </Link>
              
              {user ? (
                <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <img
                      src={user.photoURL || ""}
                      alt={user.displayName || ""}
                      className="w-12 h-12 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-bold text-gray-900">{user.displayName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-red-50 text-red-600 rounded-2xl text-lg font-bold"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    signIn();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-2xl text-lg font-bold shadow-lg"
                >
                  <User className="w-5 h-5" />
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="pt-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/manga/:id" element={<MangaDetails />} />
              <Route path="/chapter/:id" element={<ChapterReader />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}


