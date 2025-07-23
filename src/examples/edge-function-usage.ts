/**
 * Example: Using Supabase Edge Functions from GoBuddy Client
 *
 * This file demonstrates how to call the hello-world Edge Function
 * from the client-side code using the Supabase JavaScript client.
 *
 * Make sure your Supabase project has the Edge Function deployed
 * before using these examples.
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";

// TypeScript interfaces matching the Edge Function response types
interface HelloWorldResponse {
  message: string;
  timestamp: string;
  user?: string;
  success: boolean;
}

interface EdgeFunctionError {
  error: string;
  timestamp: string;
  success: false;
}

/**
 * Example 1: Basic Edge Function call without parameters
 *
 * This demonstrates the simplest way to call an Edge Function.
 */
export async function callHelloWorldBasic(): Promise<HelloWorldResponse | EdgeFunctionError> {
  try {
    const { data, error } = await supabase.functions.invoke("hello-world", {
      body: {},
    });

    if (error) {
      console.error("Edge Function error:", error);
      throw error;
    }

    console.log("Edge Function response:", data);
    return data;
  } catch (error) {
    console.error("Failed to call hello-world function:", error);
    throw error;
  }
}

/**
 * Example 2: Edge Function call with parameters (POST method)
 *
 * This shows how to pass data to the Edge Function via POST body.
 */
export async function callHelloWorldWithName(name: string): Promise<HelloWorldResponse | EdgeFunctionError> {
  try {
    const { data, error } = await supabase.functions.invoke("hello-world", {
      body: {
        name: name,
      },
    });

    if (error) {
      console.error("Edge Function error:", error);
      throw error;
    }

    console.log("Edge Function response:", data);
    return data;
  } catch (error) {
    console.error("Failed to call hello-world function with name:", error);
    throw error;
  }
}

/**
 * Example 3: Edge Function call with query parameters (GET method)
 *
 * This demonstrates using GET method with query parameters.
 * Note: Supabase functions.invoke() uses POST by default, but you can
 * use fetch() directly for GET requests if needed.
 */
export async function callHelloWorldWithQuery(name: string): Promise<HelloWorldResponse | EdgeFunctionError> {
  try {
    // Get the function URL from Supabase
    // Construct the function URL using environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/hello-world?name=${encodeURIComponent(name)}`;

    const response = await fetch(functionUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Edge Function response (GET):", data);
    return data;
  } catch (error) {
    console.error("Failed to call hello-world function with query:", error);
    throw error;
  }
}

/**
 * Example 4: Edge Function call with authentication context
 *
 * This shows how authenticated users can call Edge Functions.
 * The Edge Function will have access to the user's JWT token.
 */
export async function callHelloWorldAuthenticated(): Promise<HelloWorldResponse | EdgeFunctionError> {
  try {
    // Get the current session to ensure user is authenticated
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("hello-world", {
      body: {
        name: session.user.email?.split("@")[0] || "Authenticated User",
      },
    });

    if (error) {
      console.error("Edge Function error:", error);
      throw error;
    }

    console.log("Authenticated Edge Function response:", data);
    return data;
  } catch (error) {
    console.error("Failed to call authenticated hello-world function:", error);
    throw error;
  }
}

/**
 * Example 5: React Hook for Edge Function calls
 *
 * This demonstrates how you might use the Edge Function in a React component.
 */
export function useHelloWorld() {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<HelloWorldResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callFunction = async (name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = name ? await callHelloWorldWithName(name) : await callHelloWorldBasic();

      if (result.success) {
        setData(result as HelloWorldResponse);
      } else {
        setError((result as EdgeFunctionError).error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    data,
    error,
    callFunction,
  };
}

/**
 * Example 6: Usage in a React Component
 *
 * Here's how you might use the Edge Function in an actual component:
 */

// Uncomment the imports below if using in a real component:
// import React, { useState } from 'react'
// import { Button } from '../components/ui/button'
// import { TextInput } from '../components/form/TextInput'

/*
export function EdgeFunctionExample() {
  const [name, setName] = useState('')
  const { loading, data, error, callFunction } = useHelloWorld()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    callFunction(name || undefined)
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Edge Function Demo</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput
          label="Your Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Calling Function...' : 'Call Hello World'}
        </Button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          Error: {error}
        </div>
      )}

      {data && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
          <h3 className="font-semibold text-green-800">Response:</h3>
          <p className="text-green-700">{data.message}</p>
          <small className="text-green-600">
            Timestamp: {new Date(data.timestamp).toLocaleString()}
            {data.user && ` | User: ${data.user}`}
          </small>
        </div>
      )}
    </div>
  )
}
*/

/**
 * Deployment Notes:
 *
 * 1. To deploy this Edge Function to Supabase:
 *    - Install Supabase CLI: npm install -g supabase
 *    - Login: supabase login
 *    - Link project: supabase link --project-ref YOUR_PROJECT_REF
 *    - Deploy: supabase functions deploy hello-world
 *
 * 2. Make sure your Supabase project has Edge Functions enabled
 *
 * 3. The function will be available at:
 *    https://YOUR_PROJECT_REF.supabase.co/functions/v1/hello-world
 *
 * 4. For local development, you can run:
 *    supabase functions serve
 *
 * 5. Environment variables can be set using:
 *    supabase secrets set SECRET_NAME=secret_value
 */
