import Navbar from '../components/Navbar';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import DimensionsSection from '../components/DimensionsSection';
import HowAndLevels from '../components/HowAndLevels';

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

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

  const goToEval = () => navigate('/evaluation');

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero onStartEval={goToEval} />
      <DimensionsSection />
      <HowAndLevels onStartEval={goToEval} />
    </div>
  );
}
