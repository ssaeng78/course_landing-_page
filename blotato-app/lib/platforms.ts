export const PLATFORMS = [
  { id: "facebook", label: "Facebook", needsPage: true },
  { id: "instagram", label: "Instagram", needsPage: false },
  { id: "tiktok", label: "TikTok", needsPage: false },
  { id: "linkedin", label: "LinkedIn", needsPage: false },
  { id: "twitter", label: "X (Twitter)", needsPage: false },
  { id: "threads", label: "Threads", needsPage: false },
  { id: "youtube", label: "YouTube", needsPage: false },
  { id: "pinterest", label: "Pinterest", needsPage: false },
  { id: "bluesky", label: "Bluesky", needsPage: false },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label]),
);

export function needsSubaccounts(platform: string) {
  return platform === "facebook" || platform === "linkedin" || platform === "youtube";
}

export function defaultTarget(platform: string): Record<string, unknown> {
  switch (platform) {
    case "tiktok":
      return {
        targetType: "tiktok",
        privacyLevel: "PUBLIC_TO_EVERYONE",
        disabledComments: false,
        disabledDuet: false,
        disabledStitch: false,
        isBrandedContent: false,
        isYourBrand: false,
        isAiGenerated: false,
      };
    case "youtube":
      return {
        targetType: "youtube",
        title: "",
        privacyStatus: "public",
        shouldNotifySubscribers: false,
        isMadeForKids: false,
      };
    case "instagram":
      return { targetType: "instagram", mediaType: "reel" };
    case "threads":
      return { targetType: "threads", replyControl: "everyone" };
    default:
      return { targetType: platform };
  }
}
