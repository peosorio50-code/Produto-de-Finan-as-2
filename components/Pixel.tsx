"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Pixel da Meta (opcional). Só é montado quando META_PIXEL_ID está no .env do
 * servidor (app/layout.tsx). Manda PageView a cada página; os outros eventos
 * do funil saem de lib/pixel.ts.
 */
export function Pixel({ id }: { id: string }) {
  const caminho = usePathname();
  const primeira = useRef(true);

  useEffect(() => {
    // A primeira visualização sai junto com o carregamento do pixel.
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [caminho]);

  return (
    <Script id="pixel-meta" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`}
    </Script>
  );
}
