import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
    const proxyBase = "/api/proxy?url=";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const contentType = response.headers.get("content-type") || "";

    // ─── HTML ───
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Strip CSP / X-Frame-Options meta tags
      html = html.replace(
        /<meta[^>]*(?:http-equiv\s*=\s*["'](?:Content-Security-Policy|X-Frame-Options)["'])[^>]*>/gi,
        ""
      );

      // Remove Service Workers
      html = html.replace(/navigator\.serviceWorker\.register\([^)]*\)/g, "void(0)");

      // ── Rewrite ALL absolute URLs to go through our proxy ──
      // This is the CORS fix: every resource loads from localhost

      // Helper: rewrite a URL to go through the proxy
      function rewriteUrl(originalUrl: string): string {
        if (!originalUrl || originalUrl.startsWith("data:") || originalUrl.startsWith("blob:") || originalUrl.startsWith("javascript:") || originalUrl.startsWith("#")) {
          return originalUrl;
        }
        // Already proxied
        if (originalUrl.startsWith("/api/proxy")) return originalUrl;

        let absoluteUrl = originalUrl;
        if (originalUrl.startsWith("//")) {
          absoluteUrl = "https:" + originalUrl;
        } else if (originalUrl.startsWith("/")) {
          absoluteUrl = baseUrl + originalUrl;
        } else if (!originalUrl.startsWith("http")) {
          // Relative URL
          const pathBase = targetUrl.href.substring(0, targetUrl.href.lastIndexOf("/") + 1);
          absoluteUrl = pathBase + originalUrl;
        }

        return proxyBase + encodeURIComponent(absoluteUrl);
      }

      // Rewrite src= and href= attributes (CSS, JS, images, links, etc.)
      html = html.replace(
        /(\s(?:src|href|action))\s*=\s*["']([^"']*?)["']/gi,
        (_match, attr, urlVal) => {
          // Don't rewrite anchor links or mailto
          if (urlVal.startsWith("#") || urlVal.startsWith("mailto:") || urlVal.startsWith("tel:")) {
            return `${attr}="${urlVal}"`;
          }
          return `${attr}="${rewriteUrl(urlVal)}"`;
        }
      );

      // Rewrite srcset= attributes (responsive images)
      html = html.replace(
        /(\ssrcset)\s*=\s*["']([^"']*?)["']/gi,
        (_match, attr, srcsetVal) => {
          const rewritten = srcsetVal
            .split(",")
            .map((entry: string) => {
              const parts = entry.trim().split(/\s+/);
              if (parts[0]) parts[0] = rewriteUrl(parts[0]);
              return parts.join(" ");
            })
            .join(", ");
          return `${attr}="${rewritten}"`;
        }
      );

      // Rewrite url() in inline style attributes
      html = html.replace(
        /url\(\s*["']?([^"')]+?)["']?\s*\)/gi,
        (_match, urlVal) => {
          if (urlVal.startsWith("data:") || urlVal.startsWith("blob:")) return _match;
          return `url("${rewriteUrl(urlVal)}")`;
        }
      );

      // Do NOT inject <base> — we rewrote all URLs directly
      // This avoids the issue where <base> would cause relative URLs to resolve to the remote site

      // ── Inject overlay script ──
      const injectedScript = `
<script>
(function() {
  window.parent.postMessage({ type: 'agency-loaded' }, '*');

  var overlay = document.createElement('div');
  overlay.id = 'agency-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #0a0a0a;background:rgba(10,10,10,0.06);z-index:99999;transition:all 0.12s cubic-bezier(0.4,0,0.2,1);border-radius:4px;display:none;';
  document.body.appendChild(overlay);

  var label = document.createElement('div');
  label.id = 'agency-label';
  label.style.cssText = 'position:fixed;background:#0a0a0a;color:#fff;font-size:10px;padding:2px 8px;border-radius:4px;z-index:100000;pointer-events:none;font-family:Inter,system-ui,sans-serif;display:none;letter-spacing:0.3px;';
  document.body.appendChild(label);

  var selectMode = false;

  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'agency-select-mode') {
      selectMode = e.data.enabled;
      document.body.style.cursor = selectMode ? 'crosshair' : '';
      if (!selectMode) { overlay.style.display = 'none'; label.style.display = 'none'; }
    }
    if (e.data.type === 'agency-highlight-element') {
      try {
        var el = document.querySelector(e.data.selector);
        if (el) {
          var r = el.getBoundingClientRect();
          overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #f97316;background:rgba(249,115,22,0.08);z-index:99999;border-radius:4px;display:block;top:'+r.top+'px;left:'+r.left+'px;width:'+r.width+'px;height:'+r.height+'px;';
        }
      } catch(err) {}
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (!selectMode) return;
    var el = e.target;
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    overlay.style.top = r.top+'px'; overlay.style.left = r.left+'px';
    overlay.style.width = r.width+'px'; overlay.style.height = r.height+'px';
    overlay.style.display = 'block'; overlay.style.borderColor = '#0a0a0a';
    overlay.style.background = 'rgba(10,10,10,0.06)';
    var tag = (el.tagName||'').toLowerCase();
    var id = el.id ? '#'+el.id : '';
    var cls = el.className && typeof el.className==='string' ? '.'+el.className.trim().split(/\\s+/)[0] : '';
    label.textContent = tag+id+cls;
    label.style.top = Math.max(0,r.top-24)+'px'; label.style.left = r.left+'px'; label.style.display = 'block';
  });

  document.addEventListener('click', function(e) {
    if (!selectMode) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target;
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    var tag = (el.tagName||'').toLowerCase();
    var id = el.id ? '#'+el.id : '';
    var cls = el.className && typeof el.className==='string' ? '.'+el.className.trim().split(/\\s+/)[0] : '';
    window.parent.postMessage({type:'agency-select',selector:tag+id+cls,tagName:tag,text:(el.textContent||'').substring(0,120).trim(),rect:{top:r.top,left:r.left,width:r.width,height:r.height}},'*');
  }, true);

  document.addEventListener('click', function(e) {
    if (selectMode) return;
    var link = e.target && e.target.closest ? e.target.closest('a') : null;
    if (link && link.href) { e.preventDefault(); window.parent.postMessage({type:'agency-navigate',url:link.href},'*'); }
  }, true);

  window.onerror = function() { return true; };
  window.onunhandledrejection = function(e) { if(e&&e.preventDefault) e.preventDefault(); };
})();
</script>`;

      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, injectedScript + "</body>");
      } else {
        html += injectedScript;
      }

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "X-Frame-Options": "ALLOWALL",
        },
      });
    }

    // ─── CSS: rewrite url() references ───
    if (contentType.includes("text/css")) {
      let css = await response.text();

      css = css.replace(
        /url\(\s*["']?([^"')]+?)["']?\s*\)/gi,
        (_match, urlVal) => {
          if (urlVal.startsWith("data:") || urlVal.startsWith("blob:")) return _match;

          let absoluteUrl = urlVal;
          if (urlVal.startsWith("//")) {
            absoluteUrl = "https:" + urlVal;
          } else if (urlVal.startsWith("/")) {
            absoluteUrl = baseUrl + urlVal;
          } else if (!urlVal.startsWith("http")) {
            // Relative to the CSS file location
            const cssDir = url.substring(0, url.lastIndexOf("/") + 1);
            absoluteUrl = cssDir + urlVal;
          }

          return `url("${proxyBase}${encodeURIComponent(absoluteUrl)}")`;
        }
      );

      return new NextResponse(css, {
        status: 200,
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ─── JS: pass through ───
    if (contentType.includes("javascript")) {
      const text = await response.text();
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ─── Binary (images, fonts, etc.) ───
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Proxy error:", msg);

    const errorHtml = `<!DOCTYPE html>
<html><head><style>
body{font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;color:#0a0a0a;}
.c{text-align:center;max-width:320px;}
h3{font-size:14px;margin:0 0 6px;}
p{font-size:12px;color:#737373;margin:0;}
</style></head><body>
<div class="c">
<h3>Site inaccessible</h3>
<p>Impossible de charger le site</p>
<p style="margin-top:8px;font-size:11px;color:#a3a3a3;">${msg}</p>
</div>
<script>window.parent.postMessage({type:'agency-loaded'},'*');</script>
</body></html>`;

    return new NextResponse(errorHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
