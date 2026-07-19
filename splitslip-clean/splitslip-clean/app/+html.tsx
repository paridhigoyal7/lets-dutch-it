import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hide React Navigation web tab-bar scroll-arrow indicators (⏷ ⏶)
              (function () {
                function hideArrows() {
                  document.querySelectorAll('div').forEach(function (el) {
                    if (el.childElementCount === 0) {
                      var t = el.textContent.trim();
                      if (t === '⏷' || t === '⏶' || t === '▼' || t === '▲') {
                        var p = el.parentElement;
                        if (p) p.style.display = 'none';
                      }
                    }
                  });
                }
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', hideArrows);
                } else {
                  hideArrows();
                }
                var obs = new MutationObserver(hideArrows);
                document.addEventListener('DOMContentLoaded', function () {
                  obs.observe(document.body, { childList: true, subtree: true });
                });
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
