"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer,
  X,
  Check,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export function WebsitePreview() {
  const project = useStore((s) => s.project);
  const selectedPageUrl = useStore((s) => s.selectedPageUrl);
  const highlightSelector = useStore((s) => s.highlightSelector);
  const setHighlightSelector = useStore((s) => s.setHighlightSelector);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const currentUrl = selectedPageUrl || project?.websiteUrl || "";

  // Route through our proxy to bypass X-Frame-Options / CSP
  const proxyUrl = useMemo(() => {
    if (!currentUrl) return "";
    // retryCount in URL forces iframe to reload on retry
    return `/api/proxy?url=${encodeURIComponent(currentUrl)}&_r=${retryCount}`;
  }, [currentUrl, retryCount]);

  // Auto-dismiss loader after 5s maximum — site might have loaded partially
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoading, proxyUrl]);

  // Reset loading state when URL changes
  useEffect(() => {
    if (currentUrl) {
      setIsLoading(true);
      setLoadError(false);
    }
  }, [currentUrl, retryCount]);

  // Listen for messages from the proxied page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;

      switch (event.data.type) {
        case "agency-loaded":
          setIsLoading(false);
          setLoadError(false);
          break;
        case "agency-hover":
          break;
        case "agency-select":
          setSelectedElements((prev) => {
            if (prev.includes(event.data.selector)) return prev;
            return [...prev, event.data.selector];
          });
          setHighlightSelector(event.data.selector);
          break;
        case "agency-navigate":
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setHighlightSelector]);

  // Toggle select mode inside the iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "agency-select-mode", enabled: isSelectMode },
        "*"
      );
    }
  }, [isSelectMode]);

  // Send highlight command to iframe
  useEffect(() => {
    if (highlightSelector && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "agency-highlight-element", selector: highlightSelector },
        "*"
      );
    }
  }, [highlightSelector]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  if (!currentUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <GlobeIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Aucun site connecté</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Connectez le website de votre client pour visualiser l&apos;impact des
          modifications en temps réel.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-white">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <motion.button
          onClick={() => setIsSelectMode(!isSelectMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-elevated transition-all ${
            isSelectMode
              ? "bg-foreground text-white"
              : "bg-white text-foreground"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MousePointer className="w-3.5 h-3.5" />
          {isSelectMode ? "Sélection active" : "Sélectionner une zone"}
        </motion.button>

        {selectedElements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1 shadow-elevated"
          >
            <span className="text-[10px] text-muted-foreground font-medium">
              {selectedElements.length} zone
              {selectedElements.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                setSelectedElements([]);
                setHighlightSelector(null);
              }}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Refresh button */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <AnimatePresence>
          {highlightSelector && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 shadow-elevated">
                <Eye className="w-3.5 h-3.5 text-info" />
                <span className="text-xs font-medium">Zone d&apos;impact</span>
                <Check className="w-3 h-3 text-success" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={handleRetry}
          className="bg-white rounded-lg p-1.5 shadow-elevated hover:bg-muted transition-colors"
          title="Recharger"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Loading overlay — semi-transparent so we see the site loading behind */}
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
              Chargement du site...
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[300px] truncate px-4">
              {currentUrl}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
          <AlertTriangle className="w-8 h-8 text-warning mb-3" />
          <p className="text-sm font-medium mb-1">
            Impossible de charger le site
          </p>
          <p className="text-xs text-muted-foreground max-w-[280px] text-center mb-3">
            Le site ne peut pas être affiché en preview.
          </p>
          <button onClick={handleRetry} className="btn-secondary text-xs">
            Réessayer
          </button>
        </div>
      )}

      {/* Proxied iframe — always rendered so it loads in background */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        title="Website Preview"
      />
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
