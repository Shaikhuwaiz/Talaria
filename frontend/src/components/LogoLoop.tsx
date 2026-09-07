interface Wordmark {
  name: string;
  img?: string;
  className?: string;
}

const COMPANIES: Wordmark[] = [
  { name: "Nucor", img: "/logo/NUE_BIG.png" },
  { name: "Cleveland-Cliffs", img: "/logo/Cliffs_Natural_Resources_logo.svg" },
  { name: "U.S. Steel", img: "/logo/uss-united-states-steel-logo.png" },
  { name: "CMC", img: "/logo/CMC_Primary_Company_Mark.png" },
  { name: "Caterpillar", img: "/logo/CAT_BIG.png", className: "[filter:invert(1)_brightness(1.05)]" },
  { name: "John Deere", img: "/logo/john-deere-logo.webp", className: "h-[4.5rem] w-auto max-w-none" },
  {
    name: "Weyerhaeuser",
    img: "/logo/Weyerhaeuser-01.svg",
    className: "h-8 w-auto",
  },
];

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-16 pr-16 motion-safe:animate-[logo-marquee_34s_linear_infinite] group-hover:[animation-play-state:paused]">
      {COMPANIES.map((c) =>
        c.img ? (
          <img
            key={c.name}
            src={c.img}
            alt={`${c.name} logo`}
            className={`h-7 w-auto max-w-[150px] shrink-0 object-contain opacity-90 transition-opacity group-hover:opacity-100 ${c.className ?? ""}`}
          />
        ) : (
          <span
            key={c.name}
            className={`whitespace-nowrap text-xl uppercase sm:text-2xl opacity-80 transition-opacity group-hover:opacity-100 ${c.className}`}
          >
            {c.name}
          </span>
        ),
      )}
    </div>
  );
}

export default function LogoLoop({ className = "" }: { className?: string }) {
  return (
    <div
      className={`group relative flex w-full select-none overflow-hidden py-2 ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-neutral-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-neutral-950 to-transparent" />
      <Row />
      <Row />
    </div>
  );
}