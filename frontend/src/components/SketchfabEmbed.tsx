import { useEffect, useRef } from "react";

interface Props {
  src: string;
  title?: string;
  className?: string;
}

export default function SketchfabEmbed({
  src,
  title,
  className = "",
}: Props) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("allow", "autoplay; fullscreen; xr-spatial-tracking");
    el.setAttribute("xr-spatial-tracking", "true");
    el.setAttribute("execution-while-out-of-viewport", "true");
    el.setAttribute("execution-while-not-rendered", "true");
    el.setAttribute("web-share", "true");
    el.setAttribute("mozallowfullscreen", "true");
    el.setAttribute("webkitallowfullscreen", "true");
    el.setAttribute("allowtransparency", "true");
  }, []);

  return (
    <iframe
      ref={ref}
      title={title ?? "3D truck model"}
      src={src}
      frameBorder={0}
      allowFullScreen
      className={className}
    />
  );
}