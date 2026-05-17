const rawScheme = import.meta.env.VITE_MOBILE_APP_SCHEME?.trim() || "healthlink";

const mobileScheme = rawScheme.replace(/:\/*$/, "");

const normalizePath = (path: string) => path.replace(/^\/+/, "");

export const buildMobileDeepLink = (path: string) => `${mobileScheme}://${normalizePath(path)}`;

export function openMobileDeepLink(path: string, fallbackPath: string) {
  const startedAt = Date.now();
  window.location.href = buildMobileDeepLink(path);

  window.setTimeout(() => {
    if (document.visibilityState === "visible" && Date.now() - startedAt < 1600) {
      window.location.href = fallbackPath;
    }
  }, 900);
}
