export const GET_PHAME_SHARE_DATA: ShareData = {
  title: "Get Phame — Turn Happy Customers into 5-Star Reviews",
  text: "Send personalised review requests from your own email, automate follow-ups, and grow your reputation with Get Phame. Free to start.",
  url: "https://getphame.app/",
};

export async function getLocalizedGetPhameShareData(): Promise<ShareData> {
  try {
    const { at } = await import("./autoText");
    return {
      ...GET_PHAME_SHARE_DATA,
      title: at(GET_PHAME_SHARE_DATA.title ?? ""),
      text: at(GET_PHAME_SHARE_DATA.text ?? ""),
    };
  } catch {
    return GET_PHAME_SHARE_DATA;
  }
}

export type GetPhameShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export function getPwaPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const userAgent = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export async function shareGetPhame(): Promise<GetPhameShareOutcome> {
  if (typeof navigator === "undefined") return "failed";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(await getLocalizedGetPhameShareData());
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(GET_PHAME_SHARE_DATA.url ?? "https://getphame.app/");
    return "copied";
  } catch {
    return "failed";
  }
}
