/** Ambient background: aurora glows, blueprint grid, film grain. */
export default function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* aurora blobs */}
      <div
        className="anim-drift absolute -top-[20%] -left-[12%] h-[60vh] w-[55vw] rounded-full opacity-[0.32]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,240,255,0.34), rgba(0,102,255,0.12) 55%, transparent 75%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="anim-drift-slow absolute -right-[16%] -bottom-[24%] h-[70vh] w-[60vw] rounded-full opacity-[0.26]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,102,255,0.3), rgba(255,107,53,0.07) 60%, transparent 78%)",
          filter: "blur(70px)",
        }}
      />
      {/* blueprint grid */}
      <div className="grid-bg absolute inset-0" />
      {/* film grain */}
      <div className="grain-overlay" />
    </div>
  );
}
