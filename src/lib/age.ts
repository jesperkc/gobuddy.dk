import { maxRange, minRange } from "@modular-forms/react";

/** GoBuddy is for adults only. Also enforced by the profiles_age_range check in the database. */
export const MIN_AGE = 18;
export const MAX_AGE = 120;

export const ageValidators = [
  minRange(MIN_AGE, `Du skal være mindst ${MIN_AGE} år for at bruge GoBuddy`),
  maxRange(MAX_AGE, "Indtast en gyldig alder"),
];
