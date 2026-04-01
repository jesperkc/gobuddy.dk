import { supabase } from "@/lib/supabase";
import { createFileRoute } from "@tanstack/react-router";
import OpenAI from "openai";
import { GeneratedUser } from "../godaddy/users/generate";
import { maleFirstnames } from "@/lib/variables";

// Server-side function to generate users (client-side with server capabilities)
export async function generateUsersServerSide(
  gender: "mand" | "kvinde",
  city: string,
  userCount: number
): Promise<{ users?: GeneratedUser[]; error?: string }> {
  try {
    // Get OpenAI API key from environment
    const openaiApiKey = import.meta.env.VITE_OPENAI_KEY;

    if (!openaiApiKey) {
      return { error: "OpenAI API nøgle er ikke konfigureret" };
    }

    // Validate input
    if (!gender || !city || !userCount || userCount < 1 || userCount > 10) {
      return { error: "Ugyldige parametre" };
    }

    // Get available interests in Danish from supabase
    const { data: interestsData, error: interestsError } = await supabase.from("interests").select("interest_id, interest_da");

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
      throw new Error("Kunne ikke hente interesser: " + interestsError.message);
    }

    const interests = interestsData.map((interest) => `${interest.interest_da} (${interest.interest_id})`);
    console.log("Available interests:", interests);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });

    let users: GeneratedUser[] = [];

    const lowAge = Math.floor(Math.random() * 10) + 20; // Random age between 20 and 29
    const highAge = Math.floor(Math.random() * 10) + 50; // Random age between 50 and 59

    // Generate array of users with firstnames, gender and age
    const userArray = [];
    const userString = [];
    for (let i = 0; i < userCount; i++) {
      const age = Math.floor(Math.random() * (highAge - lowAge + 1)) + lowAge;
      const first_name = maleFirstnames[Math.floor(Math.random() * maleFirstnames.length)];
      userArray.push({ first_name, age });
      userString.push(`${first_name} ${age} årig ${gender}`);
    }

    const response = await openai.responses.parse({
      // model: "gpt-4o",
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: `Skab ${userCount} person(er), ${userString.join(", ")} som bor i ${city}, find en tilfældig adresse med tilhørende lat/lng.
                Har en til to fritidsinteresser i forbindelse med deres alder og placering i byen.
                Beskriv enkeltvis og i 1. person hvor og hvordan personen dyrker sine interesser. Har ingen eller få venner i byen og vil gerne møde nye mennesker igennem dette website.
                Mulige interesser er: ${interests.join(", ")}. Svar på en afslappet måde, på dansk`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "users",
          strict: true,
          schema: {
            type: "object",
            properties: {
              users: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    first_name: {
                      type: "string",
                      description: "The name of the user.",
                    },
                    age: {
                      type: "number",
                      description: "The age of the user.",
                    },
                    bio: {
                      type: "string",
                      description: "A brief bio of the user.",
                    },
                    location: {
                      type: "object",
                      properties: {
                        road: {
                          type: "string",
                          description: "The road of the address.",
                        },
                        house_number: {
                          type: "string",
                          description: "The house number of the address.",
                        },
                        postcode: {
                          type: "string",
                          description: "The postcode of the address.",
                        },
                        city: {
                          type: "string",
                          description: "The city of the address.",
                        },
                        country: {
                          type: "string",
                          description: "The country of the address.",
                        },
                        country_code: {
                          type: "string",
                          description: "The country_code of the address.",
                        },
                        latitude: {
                          type: "string",
                          description: "The latitude of the address.",
                        },
                        longitude: {
                          type: "string",
                          description: "The longitude of the address.",
                        },
                      },
                      required: ["latitude", "longitude", "road", "house_number", "postcode", "city", "country", "country_code"],
                      additionalProperties: false,
                    },
                    interests: {
                      type: "array",
                      description: "A list of interests that the user has.",
                      items: {
                        type: "object",
                        properties: {
                          interest_id: {
                            type: "string",
                            description: "The id of the interest.",
                          },
                          interest_da: {
                            type: "string",
                            description: "The name of the interest.",
                          },
                          description: {
                            type: "string",
                            description: "A brief description of the interest.",
                          },
                        },
                        required: ["interest_id", "interest_da", "description"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["first_name", "age", "bio", "location", "interests"],
                  additionalProperties: false,
                },
              },
            },
            required: ["users"],
            additionalProperties: false,
          },
        },
      },
      temperature: 1,
      top_p: 1,
    });

    const content = response.output_text;
    console.log("OpenAI response:", content);
    if (content) {
      users = JSON.parse(content).users || [];
    } else {
      throw new Error("No content returned from OpenAI");
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
