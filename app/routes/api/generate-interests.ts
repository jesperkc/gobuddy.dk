import { createFileRoute } from "@tanstack/react-router";
import OpenAI from "openai";

interface GeneratedInterest {
  interest_da: string;
  interest_en: string;
  description: string;
  category: string;
}

// Server-side function to generate interests
export async function generateInterestsServerSide(
  category: string,
  targetAudience: string,
  interestCount: number,
  existingInterests: string[] = []
): Promise<{ interests?: GeneratedInterest[]; error?: string }> {
  try {
    // Get OpenAI API key from environment
    const openaiApiKey = import.meta.env.VITE_OPENAI_KEY;

    if (!openaiApiKey) {
      return { error: "OpenAI API nøgle er ikke konfigureret. Check .env filen." };
    }

    // Validate input
    if (!category || !targetAudience || !interestCount || interestCount < 1 || interestCount > 30) {
      return { error: "Ugyldige parametre" };
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });

    const categoryPrompt = category === "alle" ? "alle mulige kategorier" : `kategorien "${category}"`;

    const audiencePrompt =
      targetAudience === "voksne"
        ? "voksne personer i Danmark"
        : targetAudience === "unge"
          ? "unge mennesker og teenagere i Danmark"
          : "ældre personer i Danmark";

    const existingInterestsText =
      existingInterests.length > 0
        ? `\n\nUNDGÅ FØLGENDE EKSISTERENDE INTERESSER (generer ikke duplikater):\n${existingInterests.map((interest) => `- ${interest}`).join("\n")}\n`
        : "";

    const prompt = `Generer ${interestCount} interesser og hobbyer der er populære blandt ${audiencePrompt}.
      
Fokuser på ${categoryPrompt}.${existingInterestsText}

For hver interesse skal du returnere:
- interest_da: Det danske navn for interessen
- interest_en: Det engelske navn for interessen
- category: En kategori som "Sport", "Kreativt", "Teknologi", "Udendørs", "Indendørs", "Musik", "Læring", etc.

Sørg for at interesserne er:
- Relevante for danske forhold og kultur
- Varierende i sværhedsgrad (både nybegynder-venlige og mere avancerede)
- Realistiske og praktiske at udføre
- Interessante for sociale aktiviteter og venskaber
- IKKE duplikater af allerede eksisterende interesser
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Du er en ekspert i danske hobbyer og interesser. Du skal generere interesser som JSON data der er perfekt formateret og gyldigt.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "interests",
          strict: true,
          schema: {
            type: "object",
            properties: {
              interests: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    interest_da: { type: "string" },
                    interest_en: { type: "string" },
                    category: { type: "string" },
                  },
                  required: ["interest_da", "interest_en", "category"],
                  additionalProperties: false,
                },
              },
            },
            required: ["interests"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content;

    console.log("OpenAI response:", response);
    console.log("OpenAI response:", content);
    if (!content) {
      throw new Error("Ingen indhold modtaget fra OpenAI");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      throw new Error("Kunne ikke parse OpenAI response som JSON");
    }

    if (!parsedResponse.interests || !Array.isArray(parsedResponse.interests)) {
      throw new Error("Ugyldigt response format fra OpenAI");
    }

    return { interests: parsedResponse.interests };
  } catch (error: unknown) {
    console.error("Error generating interests:", error);
    const errorMessage = error instanceof Error ? error.message : "Der opstod en fejl ved generering af interesser";
    return { error: errorMessage };
  }
}

// Placeholder route component
const APIRoute = () => {
  return null;
};

export const Route = createFileRoute("/api/generate-interests")({
  component: APIRoute,
});
