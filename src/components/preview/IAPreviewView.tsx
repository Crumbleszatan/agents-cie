"use client";

import { useStore } from "@/store/useStore";
import { useRef, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";

interface IAPreviewViewProps {
  retryCount: number;
}

export function IAPreviewView({ retryCount }: IAPreviewViewProps) {
  const project = useStore((s) => s.project);
  const selectedPageUrl = useStore((s) => s.selectedPageUrl);
  const domModifications = useStore((s) => s.domModifications);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const currentUrl = selectedPageUrl || project?.websiteUrl || "";

  const proxyUrl = useMemo(() => {
    if (!currentUrl) return "";
    return `/api/proxy?url=${encodeURIComponent(currentUrl)}&_r=${retryCount}`;
  }, [currentUrl, retryCount]);

  // Auto-dismiss loader after 5s
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, [isLoading, proxyUrl]);

  // Reset loading state on URL/retry change
  useEffect(() => {
    if (currentUrl) {
      setIsLoading(true);
      setLoadError(false);
      setIframeReady(false);
    }
  }, [currentUrl, retryCount]);

  // Listen for messages from proxied page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;
      if (event.data.type === "agency-loaded") {
        setIsLoading(false);
        setLoadError(false);
        setIframeReady(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Apply DOM modifications once iframe is ready
  useEffect(() => {
    if (iframeReady && domModifications.length > 0 && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "agency-apply-modifications", modifications: domModifications },
        "*"
      );
    }
  }, [iframeReady, domModifications]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  if (!currentUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold mb-1">IA Preview</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Connectez le website de votre client pour visualiser les modifications IA.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-white">
      {/* Modifications badge */}
      {domModifications.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 shadow-elevated">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-medium">
            {domModifications.length} modification{domModifications.length > 1 ? "s" : ""} IA
          </span>
        </div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <Loader2 className="w-6 h-6 text-foreground animate-spin mb-3" />
            <p className="text-xs font-medium text-foreground">
              Chargement de l&apos;aperçu IA...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
          <AlertTriangle className="w-8 h-8 text-warning mb-3" />
          <p className="text-sm font-medium mb-1">Impossible de charger le site</p>
        </div>
      )}

      {/* Proxied iframe — read-only, modifications applied via postMessage */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        title="IA Preview"
      />
    </div>
  );
}
