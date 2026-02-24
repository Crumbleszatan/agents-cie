"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  Check,
  Loader2,
  AlertTriangle,
  MessageSquarePlus,
  FileText,
  Lock,
} from "lucide-react";

interface WebsitePreviewProps {
  retryCount: number;
  onRetry: () => void;
}

export function WebsitePreview({ retryCount, onRetry }: WebsitePreviewProps) {
  const project = useStore((s) => s.project);
  const selectedPageUrl = useStore((s) => s.selectedPageUrl);
  const highlightSelector = useStore((s) => s.highlightSelector);
  const setHighlightSelector = useStore((s) => s.setHighlightSelector);
  const pinnedTags = useStore((s) => s.pinnedTags);
  const addPinnedTag = useStore((s) => s.addPinnedTag);
  const removePinnedTag = useStore((s) => s.removePinnedTag);
  const updateStory = useStore((s) => s.updateStory);
  const currentStory = useStore((s) => s.currentStory);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Popover state
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const currentUrl = selectedPageUrl || project?.websiteUrl || "";

  // Route through our proxy
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
          // Always enable selection mode
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              { type: "agency-select-mode", enabled: true },
              "*"
            );
          }
          break;
        case "agency-select": {
          const tagId = crypto.randomUUID();
          addPinnedTag({
            id: tagId,
            selector: event.data.selector,
            tagName: event.data.tagName || "",
            text: event.data.text || "",
            rect: event.data.rect || { x: 0, y: 0, width: 0, height: 0 },
            pageUrl: currentUrl,
          });
          setHighlightSelector(event.data.selector);
          setActiveTagId(tagId);
          break;
        }
        case "agency-navigate":
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setHighlightSelector, addPinnedTag, currentUrl]);

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

  // Popover actions
  const handleAddToChat = (tagId: string) => {
    const tag = pinnedTags.find((t) => t.id === tagId);
    if (!tag) return;
    // Inject context as a chat message placeholder — the ChatPanel listens for this
    window.dispatchEvent(
      new CustomEvent("agency-inject-chat", {
        detail: {
          text: `[Zone: ${tag.tagName}] "${tag.text?.substring(0, 80)}..." sur ${tag.pageUrl}`,
          selector: tag.selector,
          pageUrl: tag.pageUrl,
        },
      })
    );
    setActiveTagId(null);
  };

  const handleAddToStory = (tagId: string) => {
    const tag = pinnedTags.find((t) => t.id === tagId);
    if (!tag) return;
    const current = currentStory.affectedPages || [];
    if (!current.includes(tag.pageUrl)) {
      updateStory({ affectedPages: [...current, tag.pageUrl] });
    }
    setActiveTagId(null);
  };

  const handleRestrictContext = (tagId: string) => {
    const tag = pinnedTags.find((t) => t.id === tagId);
    if (!tag) return;
    // Add as a label constraint on the story
    const current = currentStory.labels || [];
    const label = `zone:${tag.selector}`;
    if (!current.includes(label)) {
      updateStory({ labels: [...current, label] });
    }
    setActiveTagId(null);
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
      {/* Pinned tags count */}
      {pinnedTags.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1 shadow-elevated">
            <span className="text-[10px] text-muted-foreground font-medium">
              {pinnedTags.length} tag{pinnedTags.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                pinnedTags.forEach((t) => removePinnedTag(t.id));
                setHighlightSelector(null);
                setActiveTagId(null);
              }}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Highlight indicator */}
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
                <span className="text-xs font-medium">Zone sélectionnée</span>
                <Check className="w-3 h-3 text-success" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Popover for active tag */}
      <AnimatePresence>
        {activeTagId && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white rounded-xl border border-border shadow-lg p-1 flex items-center gap-0.5"
          >
            <button
              onClick={() => handleAddToChat(activeTagId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
              title="Ajouter au chat"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => handleAddToStory(activeTagId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
              title="Ajouter à la User Story"
            >
              <FileText className="w-3.5 h-3.5" />
              US
            </button>
            <button
              onClick={() => handleRestrictContext(activeTagId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
              title="Restreindre le contexte"
            >
              <Lock className="w-3.5 h-3.5" />
              Contexte
            </button>
            <button
              onClick={() => {
                removePinnedTag(activeTagId);
                setActiveTagId(null);
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
          <p className="text-sm font-medium mb-1">Impossible de charger le site</p>
          <p className="text-xs text-muted-foreground max-w-[280px] text-center mb-3">
            Le site ne peut pas être affiché en preview.
          </p>
          <button onClick={onRetry} className="btn-secondary text-xs">
            Réessayer
          </button>
        </div>
      )}

      {/* Proxied iframe */}
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
