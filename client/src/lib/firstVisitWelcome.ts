export const FIRST_VISIT_WELCOME_STORAGE_KEY = "getphame:first-visit-welcome:v1";
export const FIRST_VISIT_WELCOME_ROUTES = new Set(["/", "/landing"]);

export function shouldShowFirstVisitWelcome({
  pathname,
  alreadySeen,
  installGuideVisible,
  upgradeVisible,
}: {
  pathname: string;
  alreadySeen: boolean;
  installGuideVisible: boolean;
  upgradeVisible: boolean;
}): boolean {
  return FIRST_VISIT_WELCOME_ROUTES.has(pathname) && !alreadySeen && !installGuideVisible && !upgradeVisible;
}
