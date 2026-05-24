import Navbar from '../components/Navbar';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import DimensionsSection from '../components/DimensionsSection';
import HowAndLevels from '../components/HowAndLevels';

interface HomePageProps {
  onStartEval: () => void;
  onAdminClick: () => void;
}

export default function HomePage({ onStartEval, onAdminClick }: HomePageProps) {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section) {
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location]);

  return (
    <div className="min-h-screen">
      <Navbar onStartEval={onStartEval} onAdminClick={onAdminClick} />
      <Hero onStartEval={onStartEval} />
      <DimensionsSection />
      <HowAndLevels onStartEval={onStartEval} />
    </div>
  );
}