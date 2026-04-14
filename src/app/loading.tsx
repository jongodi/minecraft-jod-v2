export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Pulsing JOD logo */}
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '2.5rem',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#00ff41',
            animation: 'pulse-opacity 1.4s ease-in-out infinite',
          }}
        >
          JOD
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem',
            letterSpacing: '0.3em',
            color: '#333',
            textTransform: 'uppercase',
            animation: 'pulse-opacity 1.4s ease-in-out infinite 0.2s',
          }}
        >
          LOADING
        </span>
      </div>

      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
