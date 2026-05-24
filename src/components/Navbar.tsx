import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

interface NavbarProps {
  onStartEval: () => void;
  onAdminClick: () => void;
  isStatic?: boolean;
}

const NAV_LINKS = [
  { label: 'الرئيسية', id: null },
  { label: 'معايير التقييم', id: 'dimensions' },
  { label: 'عن النظام', id: 'how' },
  { label: 'التواصل', id: 'footer' },
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
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (isStatic) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [isStatic]);

  function handleNavClick(id: string | null) {
    if (!isHome) {
      // مش على الرئيسية — روح عليها أول
      if (id) {
        navigate(`/?section=${id}`);
      } else {
        navigate('/');
      }
      return;
    }
    // على الرئيسية — سكرول مباشرة
    if (!id) {
      smoothScroll(0);
    } else {
      const el = document.getElementById(id);
      if (el) smoothScroll(el.getBoundingClientRect().top + window.scrollY - 80);
    }
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
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <Logo size="lg" />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <span
              key={item.label}
              onClick={() => handleNavClick(item.id)}
              className={`nav-link text-sm font-medium cursor-pointer transition-colors duration-200 ${
                isStatic ? 'text-white/60 hover:text-white' : 'text-navy/60 hover:text-navy'
              }`}
            >
              {item.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAdminClick}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
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
            className="bg-gold hover:bg-gold-dark text-navy font-bold text-sm px-5 py-2.5 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            
            ابدأ التقييم
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}