// Pet-care domain knowledge for the AI receptionist.
// Everything here is deterministic and testable — no API calls.

export type SizeClass = "toy" | "small" | "medium" | "large" | "xl";
export type CoatClass = "smooth" | "double" | "curly" | "wire" | "long";

export interface BreedProfile {
  size: SizeClass;
  coat: CoatClass;
  aliases: string[];
}

// Size multipliers applied to a service's base price.
export const SIZE_PRICE_MULTIPLIER: Record<SizeClass, number> = {
  toy: 0.85,
  small: 0.9,
  medium: 1.0,
  large: 1.2,
  xl: 1.35,
};

// Extra grooming time by size (minutes added to base duration).
export const SIZE_TIME_PADDING: Record<SizeClass, number> = {
  toy: -15,
  small: 0,
  medium: 15,
  large: 30,
  xl: 45,
};

// Coat surcharges — the economics groomers actually price by.
export const COAT_SURCHARGE: Record<CoatClass, { price: number; minutes: number; note: string }> = {
  smooth: { price: 0, minutes: 0, note: "" },
  double: { price: 15, minutes: 20, note: "double-coated breeds usually benefit from our deshed add-on" },
  curly: { price: 25, minutes: 30, note: "curly and doodle coats take extra brush-out and drying time" },
  wire: { price: 10, minutes: 15, note: "wire coats may need hand-stripping depending on the look you want" },
  long: { price: 15, minutes: 20, note: "long coats take extra brush-out time" },
};

// Common breeds a grooming/boarding front desk actually hears, with phone-transcription-friendly aliases.
export const BREED_DB: Record<string, BreedProfile> = {
  "goldendoodle": { size: "large", coat: "curly", aliases: ["golden doodle", "doodle", "groodle"] },
  "labradoodle": { size: "large", coat: "curly", aliases: ["labra doodle"] },
  "bernedoodle": { size: "large", coat: "curly", aliases: ["berne doodle", "bernadoodle"] },
  "mini goldendoodle": { size: "small", coat: "curly", aliases: ["mini doodle", "miniature goldendoodle"] },
  "poodle": { size: "medium", coat: "curly", aliases: ["standard poodle"] },
  "mini poodle": { size: "small", coat: "curly", aliases: ["miniature poodle", "toy poodle"] },
  "golden retriever": { size: "large", coat: "double", aliases: ["golden"] },
  "labrador": { size: "large", coat: "double", aliases: ["lab", "labrador retriever", "black lab", "yellow lab", "chocolate lab"] },
  "german shepherd": { size: "xl", coat: "double", aliases: ["shepherd", "gsd"] },
  "husky": { size: "large", coat: "double", aliases: ["siberian husky"] },
  "malamute": { size: "xl", coat: "double", aliases: ["alaskan malamute"] },
  "samoyed": { size: "large", coat: "double", aliases: [] },
  "pomeranian": { size: "toy", coat: "double", aliases: ["pom"] },
  "corgi": { size: "small", coat: "double", aliases: ["welsh corgi"] },
  "australian shepherd": { size: "medium", coat: "double", aliases: ["aussie"] },
  "border collie": { size: "medium", coat: "double", aliases: [] },
  "great pyrenees": { size: "xl", coat: "double", aliases: ["pyrenees"] },
  "bernese mountain dog": { size: "xl", coat: "double", aliases: ["bernese"] },
  "newfoundland": { size: "xl", coat: "double", aliases: ["newfie"] },
  "shih tzu": { size: "toy", coat: "long", aliases: ["shihtzu", "shit zu", "sheet zoo"] },
  "maltese": { size: "toy", coat: "long", aliases: [] },
  "yorkie": { size: "toy", coat: "long", aliases: ["yorkshire terrier"] },
  "havanese": { size: "toy", coat: "long", aliases: [] },
  "lhasa apso": { size: "small", coat: "long", aliases: ["lhasa"] },
  "cocker spaniel": { size: "small", coat: "long", aliases: ["cocker"] },
  "cavalier": { size: "small", coat: "long", aliases: ["cavalier king charles", "king charles"] },
  "afghan hound": { size: "large", coat: "long", aliases: ["afghan"] },
  "schnauzer": { size: "small", coat: "wire", aliases: ["mini schnauzer", "miniature schnauzer"] },
  "giant schnauzer": { size: "xl", coat: "wire", aliases: [] },
  "airedale": { size: "large", coat: "wire", aliases: ["airedale terrier"] },
  "westie": { size: "toy", coat: "wire", aliases: ["west highland terrier", "west highland white"] },
  "scottie": { size: "toy", coat: "wire", aliases: ["scottish terrier"] },
  "jack russell": { size: "toy", coat: "wire", aliases: ["jack russell terrier"] },
  "beagle": { size: "small", coat: "smooth", aliases: [] },
  "boxer": { size: "large", coat: "smooth", aliases: [] },
  "pit bull": { size: "medium", coat: "smooth", aliases: ["pitbull", "pittie", "staffordshire"] },
  "french bulldog": { size: "small", coat: "smooth", aliases: ["frenchie"] },
  "bulldog": { size: "medium", coat: "smooth", aliases: ["english bulldog"] },
  "dachshund": { size: "toy", coat: "smooth", aliases: ["doxie", "wiener dog", "weiner dog"] },
  "chihuahua": { size: "toy", coat: "smooth", aliases: [] },
  "great dane": { size: "xl", coat: "smooth", aliases: [] },
  "doberman": { size: "large", coat: "smooth", aliases: ["doberman pinscher"] },
  "rottweiler": { size: "large", coat: "smooth", aliases: ["rottie"] },
  "vizsla": { size: "medium", coat: "smooth", aliases: [] },
  "weimaraner": { size: "large", coat: "smooth", aliases: [] },
  "cat": { size: "small", coat: "long", aliases: ["kitty", "kitten", "domestic shorthair", "domestic longhair", "tabby"] },
};

// Vaccines required by service category. Falls back to these when the
// organization hasn't configured its own list.
export const DEFAULT_VACCINE_REQUIREMENTS: Record<"grooming" | "boarding" | "daycare", string[]> = {
  grooming: ["Rabies"],
  boarding: ["Rabies", "Bordetella", "DHPP"],
  daycare: ["Rabies", "Bordetella", "DHPP"],
};

// Words a caller uses that must immediately route to a human.
export const ESCALATION_TRIGGERS = [
  "bit", "bite", "bitten", "aggressive", "attack",
  "emergency", "bleeding", "injured", "injury", "hurt",
  "sick", "vomit", "seizure", "poison",
  "manager", "owner", "human", "real person", "speak to someone", "complaint", "refund", "lawsuit",
];

// Things the receptionist must never do (mirrors org.aiGuardrails intent).
export const HARD_GUARDRAILS = [
  "Never give medical advice — recommend the customer contact their veterinarian.",
  "Never confirm boarding or daycare without noting vaccine verification is required.",
  "Never quote an exact price for a first-time pet — give a range and note final pricing happens at check-in based on coat condition.",
  "Never accept aggressive-history dogs without flagging staff review.",
];

export interface MatchedBreed {
  breed: string;
  profile: BreedProfile;
}

export function matchBreed(utterance: string): MatchedBreed | null {
  const lower = ` ${utterance.toLowerCase().replace(/[^a-z\s]/g, " ")} `;
  let best: MatchedBreed | null = null;
  let bestLength = 0;
  for (const [breed, profile] of Object.entries(BREED_DB)) {
    for (const candidate of [breed, ...profile.aliases]) {
      if (lower.includes(` ${candidate} `) && candidate.length > bestLength) {
        best = { breed, profile };
        bestLength = candidate.length;
      }
    }
  }
  return best;
}

export interface PriceEstimate {
  low: number;
  high: number;
  minutes: number;
  coatNote: string;
}

export function estimatePrice(basePrice: number, baseMinutes: number, profile: BreedProfile): PriceEstimate {
  const sized = basePrice * SIZE_PRICE_MULTIPLIER[profile.size];
  const coat = COAT_SURCHARGE[profile.coat];
  const mid = sized + coat.price;
  return {
    low: Math.round((mid * 0.95) / 5) * 5,
    high: Math.round((mid * 1.15) / 5) * 5,
    minutes: baseMinutes + SIZE_TIME_PADDING[profile.size] + coat.minutes,
    coatNote: coat.note,
  };
}

export function containsEscalationTrigger(utterance: string): boolean {
  const lower = utterance.toLowerCase();
  return ESCALATION_TRIGGERS.some((trigger) => lower.includes(trigger));
}

export function vaccineRequirementsFor(
  category: "grooming" | "boarding" | "daycare",
  orgConfigured?: string[],
): string[] {
  if (orgConfigured && orgConfigured.length > 0 && category !== "grooming") {
    return orgConfigured;
  }
  return DEFAULT_VACCINE_REQUIREMENTS[category];
}
