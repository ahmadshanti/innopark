import { STAR_LABELS } from '../types';

interface SliderRatingProps {
  value: number;
  onChange: (val: number) => void;
  criterion: string;
}

const COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1' },
  2: { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' },
  3: { bg: '#FEF3E2', text: '#d4891a', border: '#F5A623' },
  4: { bg: '#E1F5EE', text: '#0F6E56', border: '#5DCAA5' },
  5: { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB' },
};

export default function SliderRating({ value, onChange, criterion }: SliderRatingProps) {
  const rated = value > 0;
  const color = rated ? COLORS[value] : null;
  const pct = rated ? ((value - 1) / 4) * 100 : 0;

  return (
    <div className="py-5 border-b border-navy/6 last:border-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-navy/80">{criterion}</span>
        {rated ? (
          <span
            className="text-xs font-bold px-3 py-1 rounded-full transition-all duration-300"
            style={{ background: color!.bg, color: color!.text, border: `1px solid ${color!.border}` }}
          >
            {value}/5 — {STAR_LABELS[value]}
          </span>
        ) : (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-navy/6 text-navy/35 border border-navy/10">
            لم يُقيَّم
          </span>
        )}
      </div>

      {!rated ? (
        // لم يتم التقييم بعد — زر للبدء
        <button
          type="button"
          onClick={() => onChange(3)}
          className="w-full border border-dashed border-navy/20 rounded-xl py-3 text-sm text-navy/35 hover:border-gold hover:text-gold transition-all duration-200"
        >
          اضغط للتقييم
        </button>
      ) : (
        // السلايدر
        <>
          <div className="flex justify-between text-[10px] text-navy/30 font-medium mb-1.5 px-0.5">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`transition-colors duration-200 ${value === n ? 'text-navy font-bold' : ''}`}>
                {n}
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              type="range"
              min={1} max={5} step={1}
              value={value}
              onChange={e => onChange(Number(e.target.value))}
              className="w-full h-2 appearance-none rounded-full outline-none cursor-pointer slider-input"
              style={{
                background: `linear-gradient(to left, ${color!.border} ${pct}%, #e2e8f0 ${pct}%)`,
              }}
            />
            <div className="absolute inset-x-0 top-0 flex justify-between px-[2px] pointer-events-none">
              {[1,2,3,4,5].map(n => (
                <div key={n} className="w-2 h-2 rounded-full border-2 border-white transition-all duration-200"
                  style={{ background: value >= n ? color!.border : '#e2e8f0' }} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}