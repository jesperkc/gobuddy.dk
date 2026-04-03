import { supabase } from "@/lib/supabase";
import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";
import { GeneratedUser } from "../godaddy/users/generate";
import { maleFirstnames } from "@/lib/variables";

// Server-side function to generate users using Claude
export async function generateUsersServerSide(
  gender: "mand" | "kvinde",
  city: string,
  userCount: number
): Promise<{ users?: GeneratedUser[]; error?: string }> {
  try {
    const claudeKey = import.meta.env.VITE_CLAUDE_KEY ?? import.meta.env.CLAUDE_KEY;

    if (!claudeKey) {
      return { error: "Claude API nøgle er ikke konfigureret. Check .env filen (VITE_CLAUDE_KEY)." };
    }

    if (!gender || !city || !userCount || userCount < 1 || userCount > 10) {
      return { error: "Ugyldige parametre" };
    }

    const { data: interestsData, error: interestsError } = await supabase.from("interests").select("interest_id, interest_da");

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
      throw new Error("Kunne ikke hente interesser: " + interestsError.message);
    }

    const interests = interestsData.map((interest) => `${interest.interest_da} (${interest.interest_id})`);

    const client = new Anthropic({
      apiKey: claudeKey,
      dangerouslyAllowBrowser: true,
    });

    const lowAge = Math.floor(Math.random() * 10) + 20;
    const highAge = Math.floor(Math.random() * 10) + 50;

    const userString = [];
    for (let i = 0; i < userCount; i++) {
      const age = Math.floor(Math.random() * (highAge - lowAge + 1)) + lowAge;
      const first_name = maleFirstnames[Math.floor(Math.random() * maleFirstnames.length)];
      userString.push(`${first_name} ${age} årig ${gender}`);
    }

    const prompt = `Skab ${userCount} person(er): ${userString.join(", ")} som bor i ${city}. Find en tilfældig rigtig adresse i ${city} med tilhørende lat/lng koordinater.
Hver person har en til to fritidsinteresser i forbindelse med deres alder og placering i byen.
Beskriv enkeltvis og i 1. person hvor og hvordan personen dyrker sine interesser. Har ingen eller få venner i byen og vil gerne møde nye mennesker igennem dette website.
Mulige interesser er: ${interests.join(", ")}. Svar på en afslappet måde, på dansk.

Returner KUN et JSON-objekt med dette præcise format:
{"users": [{"first_name": "Navn", "age": 25, "bio": "Kort bio...", "location": {"road": "Gadenavn", "house_number": "12", "postcode": "2100", "city": "København", "country": "Danmark", "country_code": "DK", "latitude": 55.6761, "longitude": 12.5683}, "interests": [{"interest_id": "uuid-fra-listen", "interest_da": "Interessenavn", "description": "Personlig beskrivelse i 1. person"}]}]}

VIGTIGT:
- Brug de præcise UUID'er fra interesse-listen ovenfor
- latitude og longitude skal være tal (ikke strenge)
- Returner KUN valid JSON, ingen anden tekst`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Ingen tekst modtaget fra Claude." };
    }

    let jsonText = textBlock.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    const parsed = JSON.parse(jsonText);
    const users: GeneratedUser[] = parsed.users || [];

    if (users.length === 0) {
      return { error: "Ingen brugere blev genereret." };
    }

    return { users };
  } catch (error: unknown) {
    console.error("Error generating users:", error);
    const errorMessage = error instanceof Error ? error.message : "Der opstod en fejl ved generering af brugere";
    return { error: errorMessage };
  }
}

// Placeholder route component
const APIRoute = () => {
  return null;
};

export const Route = createFileRoute("/api/generate-users")({
  component: APIRoute,
});
