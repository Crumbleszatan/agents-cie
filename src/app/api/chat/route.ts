import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

function getApiKey(): string {
  // First try env var
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  // Fallback: read .env.local directly
  try {
    const envPath = join(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // ignore
  }
  throw new Error("ANTHROPIC_API_KEY not found");
}

function getClient() {
  return new Anthropic({ apiKey: getApiKey() });
}

const SYSTEM_PROMPT = `Tu es un assistant expert en product management et en développement web. Tu aides des équipes à construire des User Stories complètes et précises.

TON RÔLE :
- Tu accompagnes le client dans la formulation de ses besoins website (front & back)
- Tu poses des questions précises et contextuelles, UNE PAR UNE
- Tu tiens compte du contexte de marque, du site existant, du backlog Jira, et de l'architecture technique
- Tu génères automatiquement les éléments d'une User Story au fur et à mesure

FORMAT DE RÉPONSE :
Tu dois TOUJOURS répondre en JSON avec la structure suivante :
{
  "message": "Ton message conversationnel en markdown",
  "type": "text" | "question" | "suggestion",
  "metadata": {
    "questionType": "functional" | "technical" | "ux" | "business",
    "options": ["option1", "option2"], // optionnel, suggestions cliquables affichées comme des cartes radio/checkbox
    "selectionMode": "single" | "multiple" // "single" = radio (1 seul choix), "multiple" = checkbox (plusieurs choix). Un bouton "Autre" est toujours affiché automatiquement.
  },
  "storyUpdates": { // optionnel, met à jour la US en cours
    "title": "string",
    "asA": "string",
    "iWant": "string",
    "soThat": "string",
    "priority": "low" | "medium" | "high" | "critical",
    "storyPoints": number,
    "labels": ["string"],
    "affectedPages": ["string"],
    "affectedServices": ["string"],
    "status": "draft" | "refining" | "ready"
  },
  "subtasks": [ // optionnel, nouvelles sous-tâches à ajouter
    {
      "title": "string",
      "type": "frontend" | "backend" | "design" | "qa" | "devops",
      "storyPoints": number,
      "description": "string",
      "order": number
    }
  ],
  "acceptanceCriteria": [ // optionnel, nouveaux critères d'acceptance
    {
      "given": "string",
      "when": "string",
      "then": "string",
      "completed": false
    }
  ],
  "contextUpdates": { // optionnel
    "phase": "discovery" | "specification" | "refinement" | "review",
    "questionsAsked": number,
    "currentFocus": "string"
  }
}

RÈGLES :
1. Pose UNE seule question à la fois, ciblée et pertinente
2. Progresse naturellement de la discovery vers la spécification
3. Génère les éléments de la US progressivement (pas tout d'un coup)
4. Utilise le contexte du projet pour personnaliser tes questions
5. Propose des options quand c'est pertinent pour guider le client
6. Le story points est une estimation indicative avec mention "à valider par l'équipe"
7. Détecte automatiquement les pages et services impactés
8. Adapte ton langage au niveau technique de l'utilisateur
9. Sois concis mais précis dans tes messages

PHASES :
- Discovery : comprendre le besoin global, le contexte utilisateur, le "pourquoi"
- Specification : détailler le "quoi" et le "comment", critères d'acceptance
- Refinement : sous-tâches, estimation, impact technique
- Review : validation finale, résumé complet`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context, project } = body;

    const projectContext = project
      ? `\n\nCONTEXTE PROJET :
- Nom : ${project.name}
- URL : ${project.websiteUrl}
- Secteur : ${project.brandContext?.industry || "Non spécifié"}
- Jira : ${project.integrations?.jira?.connected ? "Connecté" : "Non connecté"}
- Git : ${project.integrations?.git?.connected ? "Connecté" : "Non connecté"}
- Phase actuelle : ${context?.phase || "discovery"}
- Questions posées : ${context?.questionsAsked || 0}`
      : "";

    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT + projectContext,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock ? textBlock.text : "";

    // Try to parse JSON response
    try {
      // Find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          message: parsed.message || text,
          type: parsed.type || "text",
          metadata: parsed.metadata || {},
          storyUpdates: parsed.storyUpdates || null,
          subtasks: parsed.subtasks || null,
          acceptanceCriteria: parsed.acceptanceCriteria || null,
          contextUpdates: parsed.contextUpdates || null,
        });
      }
    } catch {
      // If JSON parsing fails, return as plain text
    }

    return NextResponse.json({
      message: text,
      type: "text",
    });
  } catch (error: unknown) {
    const err = error as Error & { status?: number; message?: string };
    console.error("Chat API error:", err.message);

    return NextResponse.json(
      {
        message: `Une erreur est survenue : ${err.message || "Erreur inconnue"}`,
        type: "text",
      },
      { status: 500 }
    );
  }
}
