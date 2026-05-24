import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

interface NavbarProps {
  onStartEval: () => void;
  onAdminClick: () => void;
  isStatic?: boolean;
}

const NAV_LINKS = [
  { label: 'الرئيسية', id: null, path: null },
  { label: 'معايير التقييم', id: 'dimensions', path: null },
  { label: 'آلية العمل', id: null, path: '/how-it-works' },
  { label: 'خطة التنفيذ', id: null, path: '/implementation' },
  { label: 'عن النظام', id: 'how', path: null },
];

function smoothScroll(targetY: number) {
  const start = window.scrollY;
  const dist = targetY - start;
  const duration = Math.min(Math.abs(dist) * 1.2, 1400);
  let startTime: number | null = null;
  const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;
  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const p = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, start + dist * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function Navbar({ onStartEval, onAdminClick, isStatic = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (isStatic) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [isStatic]);

  function handleNavClick(id: string | null, path: string | null) {
    if (path) { navigate(path); return; }
    if (!isHome) {
      if (id) { navigate(`/?section=${id}`); }
      else { navigate('/'); }
      return;
    }
    if (!id) { smoothScroll(0); }
    else {
      const el = document.getElementById(id);
      if (el) smoothScroll(el.getBoundingClientRect().top + window.scrollY - 80);
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
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`z-50 transition-all duration-300 ${
        isStatic
          ? 'relative bg-navy border-b border-white/10'
          : `fixed top-0 right-0 left-0 ${
              scrolled
                ? 'bg-white/95 backdrop-blur-md border-b border-navy/8 shadow-sm'
                : 'bg-cream/80 backdrop-blur-sm'
            }`
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-20 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <span className="md:hidden"><Logo size="sm" /></span>
          <span className="hidden md:block"><Logo size="lg" /></span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <span
              key={item.label}
              onClick={() => handleNavClick(item.id, item.path)}
              className={`nav-link text-sm font-medium cursor-pointer transition-colors duration-200 ${
                isStatic ? 'text-white/60 hover:text-white' : 'text-navy/60 hover:text-navy'
              }`}
            >
              {item.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAdminClick}
            className={`hidden md:block text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
              isStatic
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-navy/60 hover:text-navy hover:bg-navy/5'
            }`}
          >
            لوحة التحكم
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartEval}
            className="bg-gold hover:bg-gold-dark text-navy font-bold text-xs md:text-sm px-3 md:px-5 py-2 md:py-2.5 rounded-lg transition-colors duration-200 flex items-center gap-1.5 min-h-[44px]"
          >
            ابدأ التقييم
          </motion.button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isStatic ? 'text-white/70 hover:bg-white/10' : 'text-navy/70 hover:bg-navy/8'
            }`}
            aria-label="قائمة التنقل"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
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
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden overflow-hidden border-t ${
              isStatic ? 'bg-navy border-white/10' : 'bg-white/98 backdrop-blur-md border-navy/8'
            }`}
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleMobileNavClick(item.id, item.path)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                    isStatic
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-navy/70 hover:text-navy hover:bg-navy/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { setMobileOpen(false); onAdminClick(); }}
                className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                  isStatic
                    ? 'text-white/50 hover:text-white hover:bg-white/10'
                    : 'text-navy/50 hover:text-navy hover:bg-navy/5'
                }`}
              >
                لوحة التحكم
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}