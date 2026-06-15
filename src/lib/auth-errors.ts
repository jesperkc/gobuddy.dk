/**
 * Maps Supabase auth error messages (English) to user-facing Danish text.
 * Shared by login and signup so error wording stays consistent.
 */
export function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Forkert email eller adgangskode";
  if (message.includes("Email not confirmed")) return "Din email er ikke bekræftet. Tjek din indbakke.";
  if (message.includes("Too many requests") || message.includes("rate limit"))
    return "For mange forsøg. Prøv igen om lidt.";
  if (message.includes("User already registered") || message.includes("already been registered") || message.includes("already exists"))
    return "Der findes allerede en konto med denne email. Prøv at logge ind i stedet.";
  if (message.includes("Password should be at least"))
    return "Adgangskoden er for kort — brug mindst 8 tegn.";
  if (message.includes("Unable to validate email address") || message.includes("invalid format"))
    return "Emailadressen er ikke gyldig.";
  return "Der opstod en fejl. Prøv igen.";
}
