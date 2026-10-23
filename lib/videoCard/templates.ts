import type { CardTemplate, CardType } from "./types";

export const TEMPLATES: Record<CardType, CardTemplate> = {
  birthday: {
    type: "birthday",
    label: "Birthday",
    description: "Confetti and a big HAPPY BIRTHDAY",
    headline: "HAPPY BIRTHDAY!",
    defaultSubtitle: "Wishing you a day full of joy",
    subtitlePlaceholder: "Wishing you a day full of joy",
    closing: "With love,"
  },
  "thank-you": {
    type: "thank-you",
    label: "Thank you",
    description: "Say thanks in a big, happy way",
    headline: "THANK YOU!",
    defaultSubtitle: "We are so grateful!",
    subtitlePlaceholder: "for the BIG favor",
    closing: "With love,"
  },
  celebration: {
    type: "celebration",
    label: "Celebration",
    description: "Congratulations, new job, big win",
    headline: "CONGRATULATIONS!",
    defaultSubtitle: "Time to celebrate!",
    subtitlePlaceholder: "on your big win",
    closing: "With love,"
  }
};

export const DEFAULT_ACCENT_HEX = "#FAC846";
