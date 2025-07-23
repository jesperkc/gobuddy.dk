import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

// Define TypeScript interfaces for better type safety
interface HelloWorldRequest {
  name?: string;
}

interface HelloWorldResponse {
  message: string;
  timestamp: string;
  user?: string;
  success: boolean;
}

interface ErrorResponse {
  error: string;
  timestamp: string;
  success: false;
}

/**
 * Supabase Edge Function: Hello World
 *
 * This is a dummy Edge Function that demonstrates basic patterns for:
 * - Request handling with query parameters
 * - Response formatting with proper JSON structure
 * - CORS headers for web client compatibility
 * - Error handling and validation
 * - TypeScript type definitions
 *
 * @param request - The incoming HTTP request
 * @returns Promise<Response> - JSON response with greeting or error
 */
serve(async (req: Request): Promise<Response> => {
  try {
    // Set up CORS headers for web client compatibility
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Content-Type": "application/json",
    };

    // Handle preflight OPTIONS request for CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only allow GET and POST methods
    if (req.method !== "GET" && req.method !== "POST") {
      const errorResponse: ErrorResponse = {
        error: `Method ${req.method} not allowed. Use GET or POST.`,
        timestamp: new Date().toISOString(),
        success: false,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Parse query parameters from URL
    const url = new URL(req.url);
    let requestData: HelloWorldRequest = {};

    if (req.method === "GET") {
      // Extract name from query parameters
      const name = url.searchParams.get("name");
      if (name) {
        requestData.name = name;
      }
    } else if (req.method === "POST") {
      // For POST requests, try to parse JSON body
      try {
        const body = await req.text();
        if (body) {
          const parsedBody = JSON.parse(body) as HelloWorldRequest;
          requestData = parsedBody;
        }
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        const errorResponse: ErrorResponse = {
          error: "Invalid JSON in request body",
          timestamp: new Date().toISOString(),
          success: false,
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    // Validate and sanitize the name parameter if provided
    let userName: string | undefined;
    if (requestData.name) {
      // Basic validation: ensure name is a non-empty string and not too long
      const trimmedName = requestData.name.toString().trim();
      if (trimmedName.length > 0 && trimmedName.length <= 100) {
        // Basic sanitization: remove potentially harmful characters
        userName = trimmedName.replace(/[<>&"']/g, "");
      }
    }

    // Create the response message
    const message = userName
      ? `Hello, ${userName}! Welcome to GoBuddy's Edge Functions.`
      : "Hello, World! This is a GoBuddy Edge Function.";

    // Construct the successful response
    const response: HelloWorldResponse = {
      message,
      timestamp: new Date().toISOString(),
      user: userName,
      success: true,
    };

    // Log the request for debugging (visible in Supabase logs)
    console.log(`Hello World Edge Function called:`, {
      method: req.method,
      user: userName,
      timestamp: response.timestamp,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    // Handle any unexpected errors
    console.error("Edge Function Error:", error);

    const errorResponse: ErrorResponse = {
      error: "Internal server error occurred",
      timestamp: new Date().toISOString(),
      success: false,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});
