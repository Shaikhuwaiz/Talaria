import { useEffect, useRef } from "react";

interface Props {
  src: string;
  className?: string;
  autoSpin?: number;
}

function uidFromSrc(src: string): string {
  const m = src.match(/models\/([a-zA-Z0-9]+)/);
  return m ? m[1] : src;
}

export default function SketchfabViewer({
  src,
  className = "",
  autoSpin = 2,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let disposed = false;

    const loadApi = (): Promise<boolean> =>
      new Promise((resolve) => {
        if ((window as any).Sketchfab) {
          resolve(true);
          return;
        }
        const existing = document.querySelector<HTMLScriptElement>(
          "script[data-sketchfab-api]"
        );
        if (existing) {
          existing.addEventListener("load", () => resolve(true), { once: true });
          existing.addEventListener("error", () => resolve(false), { once: true });
          return;
        }
        const el = document.createElement("script");
        el.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
        el.dataset.sketchfabApi = "1";
        el.onload = () => resolve(true);
        el.onerror = () => resolve(false);
        document.body.appendChild(el);
      });

    loadApi().then((ok) => {
      if (!ok || disposed) return;
      const SW = (window as any).Sketchfab;
      const client = new SW(iframe);
      client.init(uidFromSrc(src), {
        autostart: 1,
        transparent: 1,
        autospin: autoSpin,
        scrollwheel: 1,
        success: (api: any) => {
          if (disposed) return;
          api.addEventListener("viewerready", () => {
            if (disposed) return;
            try {
              api.pause();
            } catch {
              // no animation track — nothing to pause
            }
          });
        },
        error: () => {},
      });
    });

    return () => {
      disposed = true;
    };
  }, [src, autoSpin]);

  return (
    <iframe
      ref={iframeRef}
      title="3D truck model"
      allowFullScreen
      className={className}
    />
  );
}