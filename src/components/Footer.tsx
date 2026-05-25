interface FooterProps {
  containerClassName?: string;
  className?: string;
}

export default function Footer({
  containerClassName = 'max-w-5xl',
  className = '',
}: FooterProps) {
  return (
    <footer className={`bg-[#0f1e47] py-5 px-4 md:px-8 flex-shrink-0 ${className}`.trim()}>
      <div className={`${containerClassName} mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2`}>
        <div className="flex items-center gap-3">
          <img
            src="/logo.webp"
            alt="INNOPARK"
            width={36}
            height={36}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontWeight: 800,
                color: '#F5A623',
                fontSize: '13px',
                letterSpacing: '2px',
              }}
            >
              INNOPARK
            </div>
            <div
              style={{
                fontFamily: "'Tajawal',sans-serif",
                color: 'rgba(255,255,255,0.25)',
                fontSize: '10px',
              }}
            >
              حديقة النجاح للابتكار
            </div>
          </div>
        </div>
        <div className="text-white/20 text-xs">© 2026 جميع الحقوق محفوظة</div>
      </div>
    </footer>
  );
}
