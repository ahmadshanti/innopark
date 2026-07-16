import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../lib/use-auth";
import { isAdminProfile, isJudgeProfile } from "../lib/authorization";

type UserRole = "visitor" | "judge" | "admin";

const NAV_LINKS = [
  { label: "الرئيسية", id: null, path: null },
  { label: "عن النظام", id: null, path: "/about" },
  { label: "معايير التقييم", id: null, path: "/criteria" },
  { label: "آلية العمل", id: null, path: "/how-it-works" },
  { label: "خطة التنفيذ", id: null, path: "/implementation" },
  { label: "الحكّام", id: null, path: "/judges" },
];

function smoothScroll(targetY: number) {
  const start = window.scrollY;
  const dist = targetY - start;
  const duration = Math.min(Math.abs(dist) * 1.2, 1400);
  let startTime: number | null = null;
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const p = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, start + dist * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function Navbar({ isStatic = false }: { isStatic?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, signOut } = useAuth();
  const isHome = location.pathname === "/";
  const userRole: UserRole =
    session && isAdminProfile(profile)
      ? "admin"
      : session && isJudgeProfile(profile)
        ? "judge"
        : "visitor";

  useEffect(() => {
    if (isStatic) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isStatic]);

  function handleNavClick(id: string | null, path: string | null) {
    if (path) {
      navigate(path);
      return;
    }
    if (!isHome) {
      if (id) {
        navigate(`/?section=${id}`);
      } else {
        navigate("/");
      }
      return;
    }
    if (!id) {
      smoothScroll(0);
    } else {
      const el = document.getElementById(id);
      if (el)
        smoothScroll(el.getBoundingClientRect().top + window.scrollY - 80);
    }
  }

  function handleMobileNavClick(id: string | null, path: string | null) {
    setMobileOpen(false);
    handleNavClick(id, path);
  }

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`z-50 transition-all duration-300 ${
        isStatic
          ? "relative bg-navy border-b border-white/10"
          : `fixed top-0 right-0 left-0 ${
              scrolled
                ? "bg-white/95 backdrop-blur-md border-b border-navy/8 shadow-sm"
                : "bg-cream/80 backdrop-blur-sm"
            }`
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-20 flex items-center justify-between">
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => navigate("/")}
          aria-label="الرئيسية"
        >
          <span className="md:hidden">
            <Logo size="sm" />
          </span>
          <span className="hidden md:block">
            <Logo size="lg" />
          </span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNavClick(item.id, item.path)}
              className={`nav-link text-sm font-medium cursor-pointer transition-colors duration-200 ${
                isStatic
                  ? "text-white/60 hover:text-white"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Visitor: login link */}
          {userRole === "visitor" && (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={`hidden md:block text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                isStatic
                  ? "text-white/60 hover:text-white hover:bg-white/10"
                  : "text-navy/60 hover:text-navy hover:bg-navy/5"
              }`}
            >
              دخول
            </button>
          )}

          {/* Judge: dashboard + avatar + logout */}
          {userRole === "judge" && (
            <>
              <button
                type="button"
                onClick={() => navigate("/judge")}
                className={`hidden md:block text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                  isStatic
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-navy/60 hover:text-navy hover:bg-navy/5"
                }`}
              >
                لوحتي
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                title="الملف الشخصي"
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-navy/20 hover:border-navy/50 transition-all flex-shrink-0"
              >
                <img
                  src={profile?.avatar_url || "/logo.webp"}
                  alt="الملف الشخصي"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={async () => { await signOut(); navigate("/"); }}
                className={`hidden md:block text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                  isStatic
                    ? "text-white/40 hover:text-red-400"
                    : "text-navy/40 hover:text-red-500"
                }`}
              >
                خروج
              </button>
            </>
          )}

          {/* Admin: dashboard + avatar + logout */}
          {userRole === "admin" && (
            <>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className={`hidden md:block text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                  isStatic
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-navy/60 hover:text-navy hover:bg-navy/5"
                }`}
              >
                لوحة التحكم
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin-profile")}
                title="الملف الشخصي"
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-navy/20 hover:border-navy/50 transition-all flex-shrink-0"
              >
                <img
                  src={profile?.avatar_url || "/logo.webp"}
                  alt="الملف الشخصي"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={async () => { await signOut(); navigate("/"); }}
                className={`hidden md:block text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                  isStatic
                    ? "text-white/40 hover:text-red-400"
                    : "text-navy/40 hover:text-red-500"
                }`}
              >
                خروج
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isStatic
                ? "text-white/70 hover:bg-white/10"
                : "text-navy/70 hover:bg-navy/8"
            }`}
            aria-label="قائمة التنقل"
          >
            {mobileOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden overflow-hidden border-t ${
              isStatic
                ? "bg-navy border-white/10"
                : "bg-white/98 backdrop-blur-md border-navy/8"
            }`}
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleMobileNavClick(item.id, item.path)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                    isStatic
                      ? "text-white/70 hover:text-white hover:bg-white/10"
                      : "text-navy/70 hover:text-navy hover:bg-navy/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {userRole === "visitor" && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/login");
                  }}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                    isStatic
                      ? "text-white/50 hover:text-white hover:bg-white/10"
                      : "text-navy/50 hover:text-navy hover:bg-navy/5"
                  }`}
                >
                  دخول
                </button>
              )}

              {userRole === "judge" && (
                <>
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/judge"); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isStatic
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-navy/70 hover:text-navy hover:bg-navy/5"
                    }`}
                  >
                    لوحتي
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/profile"); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isStatic
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-navy/70 hover:text-navy hover:bg-navy/5"
                    }`}
                  >
                    الملف الشخصي
                  </button>
                  <button
                    onClick={async () => { setMobileOpen(false); await signOut(); navigate("/"); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isStatic
                        ? "text-white/40 hover:text-red-400 hover:bg-white/10"
                        : "text-red-500/70 hover:text-red-600 hover:bg-red-50"
                    }`}
                  >
                    خروج
                  </button>
                </>
              )}

              {userRole === "admin" && (
                <>
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/admin"); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isStatic
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-navy/70 hover:text-navy hover:bg-navy/5"
                    }`}
                  >
                    لوحة التحكم
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/admin-profile"); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isStatic
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-navy/70 hover:text-navy hover:bg-navy/5"
                    }`}
                  >
                    الملف الشخصي
                  </button>
                  <button
                    onClick={async () => { setMobileOpen(false); await signOut(); navigate("/"); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isStatic
                        ? "text-white/40 hover:text-red-400 hover:bg-white/10"
                        : "text-red-500/70 hover:text-red-600 hover:bg-red-50"
                    }`}
                  >
                    خروج
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
