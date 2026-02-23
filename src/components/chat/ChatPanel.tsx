"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { uuid } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  ArrowUp,
  Paperclip,
  CornerDownLeft,
  Lightbulb,
  Target,
  Layers,
  MousePointer,
  Check,
  Circle,
  Square,
  CheckSquare,
  PenLine,
} from "lucide-react";
import type { ChatMessage } from "@/types";

export function ChatPanel() {
  const messages = useStore((s) => s.messages);
  const addMessage = useStore((s) => s.addMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const isAiTyping = useStore((s) => s.isAiTyping);
  const setAiTyping = useStore((s) => s.setAiTyping);
  const context = useStore((s) => s.context);
  const updateContext = useStore((s) => s.updateContext);
  const updateStory = useStore((s) => s.updateStory);
  const addSubtask = useStore((s) => s.addSubtask);
  const addAcceptanceCriterion = useStore((s) => s.addAcceptanceCriterion);
  const project = useStore((s) => s.project);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (messages.length === 0 && project) {
      const welcomeMessage: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: `Bonjour ! Je suis prêt à vous aider à construire votre besoin pour **${project.name}**.\n\nDécrivez-moi la fonctionnalité que vous souhaitez développer. Je vous guiderai étape par étape en tenant compte de votre contexte technique et métier.`,
        timestamp: new Date(),
        type: "text",
      };
      addMessage(welcomeMessage);
    }
  }, [project, messages.length, addMessage]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isAiTyping) return;

      const userMessage: ChatMessage = {
        id: uuid(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
        type: "text",
      };

      addMessage(userMessage);
      setInput("");
      setAiTyping(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context,
            project,
          }),
        });

        const data = await response.json();

        if (data.message) {
          const aiMessage: ChatMessage = {
            id: uuid(),
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
            type: data.type || "text",
            metadata: data.metadata
              ? {
                  ...data.metadata,
                  selectionMode: data.metadata?.selectionMode || "single",
                }
              : undefined,
          };
          addMessage(aiMessage);
        }

        if (data.storyUpdates) updateStory(data.storyUpdates);
        if (data.subtasks) {
          for (const subtask of data.subtasks) {
            addSubtask({ ...subtask, id: uuid() });
          }
        }
        if (data.acceptanceCriteria) {
          for (const criterion of data.acceptanceCriteria) {
            addAcceptanceCriterion({ ...criterion, id: uuid() });
          }
        }
        if (data.contextUpdates) updateContext(data.contextUpdates);
      } catch {
        addMessage({
          id: uuid(),
          role: "assistant",
          content: "Désolé, une erreur est survenue. Pouvez-vous reformuler votre besoin ?",
          timestamp: new Date(),
          type: "text",
        });
      } finally {
        setAiTyping(false);
      }
    },
    [isAiTyping, messages, context, project, addMessage, setAiTyping, updateStory, addSubtask, addAcceptanceCriterion, updateContext]
  );

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = "44px";
    target.style.height = Math.min(target.scrollHeight, 160) + "px";
  };

  const handleOptionSubmit = (messageId: string, answer: string) => {
    updateMessage(messageId, { optionsAnswered: true });
    sendMessage(answer);
  };

  const quickActions = [
    { icon: Target, label: "Nouvelle feature", prompt: "Je souhaite ajouter une nouvelle fonctionnalité : " },
    { icon: Layers, label: "Amélioration", prompt: "Je voudrais améliorer " },
    { icon: MousePointer, label: "Pointer sur le site", prompt: "", action: "point" },
    { icon: Lightbulb, label: "Suggestion IA", prompt: "Que me suggères-tu d'améliorer sur le site ?" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Assistant IA</h2>
            <p className="text-[11px] text-muted-foreground">
              Phase : {context.phase} · {context.questionsAsked} questions
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[92%]">
                {/* Message bubble */}
                <div
                  className={
                    msg.role === "user"
                      ? "bg-foreground text-white rounded-2xl rounded-br-md px-4 py-2.5"
                      : "bg-muted rounded-2xl rounded-bl-md px-4 py-2.5"
                  }
                >
                  <MessageContent content={msg.content} />
                </div>

                {/* Options — OUTSIDE the bubble, clean card UI */}
                {msg.role === "assistant" &&
                  msg.metadata?.options &&
                  msg.metadata.options.length > 0 && (
                    <OptionsSelector
                      messageId={msg.id}
                      options={msg.metadata.options}
                      selectionMode={msg.metadata.selectionMode || "single"}
                      answered={msg.optionsAnswered || false}
                      onSubmit={(answer) => handleOptionSubmit(msg.id, answer)}
                    />
                  )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isAiTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((delay) => (
                    <motion.div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.prompt) {
                    setInput(action.prompt);
                    textareaRef.current?.focus();
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left"
              >
                <action.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-border-light">
        <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2">
          <button className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-muted-foreground">
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Décrivez votre besoin..."
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/60 min-h-[44px] max-h-[160px] py-2"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAiTyping}
            className={`p-2 rounded-xl transition-all ${
              input.trim() && !isAiTyping
                ? "bg-foreground text-white hover:opacity-85"
                : "bg-border text-muted-foreground"
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center mt-1.5">
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <CornerDownLeft className="w-2.5 h-2.5" />
            Entrée pour envoyer · Shift+Entrée pour un saut de ligne
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Markdown-lite renderer ─── */
function MessageContent({ content }: { content: string }) {
  return (
    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
      {content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

/* ─── Options Selector ─── */
function OptionsSelector({
  messageId,
  options,
  selectionMode,
  answered,
  onSubmit,
}: {
  messageId: string;
  options: string[];
  selectionMode: "single" | "multiple";
  answered: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");
  const otherRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showOther) otherRef.current?.focus();
  }, [showOther]);

  /* ── Already answered: show pill badges ── */
  if (answered) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 flex flex-wrap gap-1.5">
        {Array.from(selected).map((item) => (
          <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 border border-foreground/10 text-xs font-medium">
            <Check className="w-3 h-3 text-success" />
            {item}
          </div>
        ))}
      </motion.div>
    );
  }

  const isRadio = selectionMode === "single";

  const toggleOption = (option: string) => {
    setShowOther(false);
    if (isRadio) {
      setSelected(new Set([option]));
    } else {
      const next = new Set(selected);
      next.has(option) ? next.delete(option) : next.add(option);
      setSelected(next);
    }
  };

  const handleSubmit = () => {
    const items = Array.from(selected);
    if (showOther && otherText.trim()) items.push(otherText.trim());
    if (items.length === 0) return;
    onSubmit(items.join(", "));
  };

  const handleOtherSubmit = () => {
    if (!otherText.trim()) return;
    setSelected(new Set([otherText.trim()]));
    onSubmit(otherText.trim());
  };

  const hasSelection = selected.size > 0 || (showOther && otherText.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.08 }}
      className="mt-3 space-y-1.5"
    >
      {/* Selection mode indicator */}
      <div className="flex items-center gap-1.5 px-1 mb-1">
        {isRadio ? (
          <Circle className="w-3 h-3 text-muted-foreground" />
        ) : (
          <CheckSquare className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {isRadio ? "Choix unique" : "Choix multiples"}
        </span>
      </div>

      {/* Option cards */}
      {options.map((option, i) => {
        const active = selected.has(option);
        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i }}
            onClick={() => toggleOption(option)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all border
              ${active
                ? "bg-foreground text-white border-foreground shadow-sm"
                : "bg-white text-foreground border-border-light hover:border-foreground/20 hover:shadow-sm"
              }`}
          >
            {/* Indicator */}
            <span className="flex-shrink-0">
              {isRadio ? (
                active ? (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-border" />
                )
              ) : active ? (
                <CheckSquare className="w-[18px] h-[18px] text-white" />
              ) : (
                <Square className="w-[18px] h-[18px] text-border" />
              )}
            </span>

            <span className="flex-1">{option}</span>

            {active && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                <Check className="w-4 h-4 text-white" />
              </motion.span>
            )}
          </motion.button>
        );
      })}

      {/* "Autre" button */}
      <motion.button
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.04 * options.length }}
        onClick={() => {
          setShowOther(!showOther);
          if (isRadio) setSelected(new Set());
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all border
          ${showOther
            ? "bg-foreground/5 border-foreground/20 text-foreground"
            : "bg-white border-border-light text-muted-foreground hover:border-foreground/20 hover:text-foreground"
          }`}
      >
        <PenLine className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="flex-1">Autre...</span>
      </motion.button>

      {/* "Autre" text input */}
      <AnimatePresence>
        {showOther && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={otherRef}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleOtherSubmit();
                  }
                }}
                placeholder="Saisissez votre réponse..."
                className="flex-1 text-[13px] bg-white px-3.5 py-2.5 rounded-xl border border-border-light outline-none focus:border-foreground transition-colors"
              />
              <button
                onClick={handleOtherSubmit}
                disabled={!otherText.trim()}
                className={`p-2.5 rounded-xl transition-all ${
                  otherText.trim() ? "bg-foreground text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validate button */}
      {hasSelection && !showOther && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-[13px] font-semibold hover:opacity-90 transition-all shadow-sm mt-1"
        >
          <Check className="w-4 h-4" />
          Valider
          {selectionMode === "multiple" && selected.size > 0 && (
            <span className="ml-1 text-white/60 text-[11px]">
              ({selected.size} sélectionné{selected.size > 1 ? "s" : ""})
            </span>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}
