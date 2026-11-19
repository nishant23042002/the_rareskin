/**
 * A small drawing of the certificate that shows where the number and QR code are, for the
 * landing state of /verify. A schematic (blocks for text), not a certificate: nothing in it
 * could be mistaken for a real record.
 */
export function FindTheNumber() {
  // a stylised QR: three finder squares and a scatter of modules
  const dots: [number, number][] = [
    [26, 4], [30, 4], [34, 8], [26, 12], [30, 16], [38, 12], [34, 20], [26, 24],
    [38, 24], [8, 28], [16, 30], [24, 34], [30, 30], [36, 36], [20, 40], [44, 32],
    [44, 44], [12, 44], [32, 44], [40, 40],
  ];
  return (
    <figure className="cv-map">
      <svg
        viewBox="0 0 360 255"
        role="img"
        aria-label="A certificate drawn as blocks. The certificate number sits beside the QR code, at the bottom of the dark panel on the left; it is circled."
      >
        <rect x="0.5" y="0.5" width="359" height="254" fill="#F2F1ED" stroke="#CFCDC6" />
        {/* dark panel */}
        <rect x="0.5" y="0.5" width="98" height="254" fill="#100E0C" />
        <rect x="14" y="22" width="66" height="7" rx="1" fill="#F2F1ED" opacity="0.9" />
        <rect x="14" y="35" width="52" height="2.5" fill="#C5A880" opacity="0.8" />
        <rect x="14" y="40" width="40" height="2.5" fill="#C5A880" opacity="0.55" />
        <path d="M14 92h20M42 92l4-4 4 4-4 4z" stroke="#C5A880" fill="none" strokeWidth="0.8" />
        {[104, 112, 120, 128].map((y, i) => (
          <rect key={y} x="14" y={y} width={i === 3 ? 38 : 66} height="2.5" fill="#B8B1A4" opacity="0.45" />
        ))}
        {/* QR */}
        <g transform="translate(14 146)">
          <rect width="56" height="56" fill="#F2F1ED" />
          <g transform="translate(5 5)" fill="#1A1714">
            <path d="M0 0h14v14H0zM2 2v10h10V2z" fillRule="evenodd" />
            <rect x="4" y="4" width="6" height="6" />
            <path d="M32 0h14v14H32zM34 2v10h10V2z" fillRule="evenodd" transform="translate(-4 0)" />
            <rect x="32" y="4" width="6" height="6" transform="translate(-4 0)" />
            <path d="M0 32h14v14H0zM2 34v10h10V34z" fillRule="evenodd" transform="translate(0 -4)" />
            <rect x="4" y="32" width="6" height="6" />
            {dots.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="3.4" height="3.4" transform="scale(.9) translate(8 2)" />
            ))}
          </g>
        </g>
        {/* number, circled */}
        <rect x="14" y="213" width="70" height="7" fill="#F2F1ED" opacity="0.95" />
        <rect x="9" y="207" width="80" height="19" rx="2" fill="none" stroke="#C5A880" strokeWidth="1.5" strokeDasharray="4 2.5" />
        {/* ivory side */}
        <rect x="112" y="12" width="236" height="231" fill="none" stroke="#A88B5C" strokeWidth="1" />
        <rect x="116" y="16" width="228" height="223" fill="none" stroke="#A88B5C" strokeWidth="0.5" opacity="0.6" />
        {[[112, 12], [348, 12], [112, 243], [348, 243]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 3.5} y={y - 3.5} width="7" height="7" fill="#F2F1ED" stroke="#A88B5C" transform={`rotate(45 ${x} ${y})`} />
        ))}
        <path d="M134 40h22M164 40l4-4 4 4-4 4z" stroke="#A88B5C" fill="none" strokeWidth="0.8" />
        <rect x="134" y="58" width="150" height="14" rx="1" fill="#1A1714" opacity="0.85" />
        <rect x="134" y="86" width="86" height="4" fill="#5E5850" opacity="0.5" />
        <rect x="134" y="98" width="120" height="12" rx="1" fill="#1A1714" opacity="0.75" />
        <rect x="134" y="128" width="104" height="4" fill="#1A1714" opacity="0.35" />
        <rect x="134" y="138" width="130" height="8" rx="1" fill="#1A1714" opacity="0.6" />
        <rect x="134" y="156" width="196" height="3" fill="#1A1714" opacity="0.3" />
        <rect x="134" y="164" width="170" height="3" fill="#1A1714" opacity="0.3" />
        <rect x="134" y="184" width="56" height="0.8" fill="#1A1714" />
        <rect x="270" y="184" width="60" height="0.8" fill="#1A1714" />
        {/* callout */}
        <path d="M89 216.5h34" stroke="#A88B5C" strokeWidth="1.2" />
        <circle cx="123" cy="216.5" r="2.6" fill="#A88B5C" />
        <rect x="128" y="195" width="132" height="43" rx="2" fill="#A88B5C" />
        <text x="138" y="212" fill="#F2F1ED" fontSize="10.5" fontWeight="600" letterSpacing="0.6" fontFamily="var(--font-jost), system-ui, sans-serif">
          CERTIFICATE NO.
        </text>
        <text x="138" y="228" fill="#F2F1ED" fontSize="10.5" letterSpacing="0.4" fontFamily="var(--font-jost), system-ui, sans-serif">
          TRS-INT-2026-001
        </text>
      </svg>
      <figcaption>The number is beside the QR code, on the dark panel of the certificate.</figcaption>
    </figure>
  );
}
