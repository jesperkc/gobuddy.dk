import OpenAI from "openai";

console.log("VITE_OPENAI_KEY", process.env.VITE_OPENAI_KEY);
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_KEY,
});

const city = "Aarhus, Denmark";
const interests = "cykling, svømning, bouldering, spille brætspil, Sy, Strikke, Løb";
const gender = "mand";

export const getInterestDescription = createServerFn({
  method: "POST", // HTTP method to use
  response: "data", // Response handling mode
}).handler(async (ctx) => {
  // const { thread, user } = ctx;
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `Skab en ${gender} i 20'erne med to fritidsinteresser. 
            Personen bor i ${city}, find en tilfældig adresse med tilhørende lat/lng. 
            Beskriv enkeltvis og i 1. person hvor og hvordan personen dyrker sine interesser. Personen har ingen venner i byen og vil gerne møde nye mennesker igennem dette website.
            Mulige interesser er: ${interests}. Svar på dansk`,
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "user",
        strict: true,
        schema: {
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
                  interest_da: {
                    type: "string",
                    description: "The name of the interest.",
                  },
                  description: {
                    type: "string",
                    description: "A brief description of the interest.",
                  },
                },
                required: ["interest_da", "description"],
                additionalProperties: false,
              },
            },
          },
          required: ["first_name", "age", "location", "interests"],
          additionalProperties: false,
        },
      },
    },
    temperature: 1,
    max_completion_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  if (response) {
    console.log(response.choices);
  }

  console.log("Server GET");

  return { response };
});
