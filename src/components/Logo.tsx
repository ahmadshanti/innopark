interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizes = { sm: 52, md: 72, lg: 96 };
  const s = sizes[size];

  const textSize = {
    sm: { en: '14px', ar: '9px' },
    md: { en: '16px', ar: '10px' },
    lg: { en: '20px', ar: '11px' },
  };

  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.webp"
        alt="INNOPARK"
        width={s}
        height={s}
        style={{ objectFit: 'contain' }}
      />
      <div>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 800,
          letterSpacing: '2px',
          color: '#1B3A7A',
          fontSize: textSize[size].en,
          lineHeight: 1.2,
        }}>
          INNOPARK
        </div>
        <div style={{
          fontFamily: "'Tajawal', sans-serif",
          color: 'rgba(27,58,122,0.45)',
          fontSize: textSize[size].ar,
          marginTop: '2px',
        }}>
          حديقة النجاح للابتكار
        </div>
      </div>
    </div>
  );
}
