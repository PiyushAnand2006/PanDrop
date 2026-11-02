/** Ambient background: warm aurora glows, soft grid, film grain. */
export default function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* aurora blobs — pink / violet / blue */}
      <div
        className="anim-drift absolute -top-[22%] -left-[10%] h-[62vh] w-[56vw] rounded-full opacity-[0.3]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(236,72,153,0.32), rgba(139,92,246,0.14) 55%, transparent 75%)",
          filter: "blur(64px)",
        }}
      />
      <div
        className="anim-drift-slow absolute -right-[14%] -bottom-[26%] h-[72vh] w-[62vw] rounded-full opacity-[0.28]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(37,99,235,0.34), rgba(139,92,246,0.1) 58%, transparent 78%)",
          filter: "blur(72px)",
        }}
      />
      <div
        className="anim-drift absolute top-[38%] left-[46%] h-[40vh] w-[36vw] rounded-full opacity-[0.12]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,114,182,0.4), transparent 72%)",
          filter: "blur(70px)",
        }}
      />
      {/* soft grid */}
      <div className="grid-bg absolute inset-0" />
      {/* film grain */}
      <div className="grain-overlay" />
    </div>
  );
}
