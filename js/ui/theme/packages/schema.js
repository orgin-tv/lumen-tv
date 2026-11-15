export const THEME_PACKAGE_API_VERSION = 1;

export const REQUIRED_THEME_PACKAGE_FIELDS = Object.freeze([
  "id",
  "name",
  "version",
  "apiVersion",
  "tokens"
]);

export function isSupportedThemeApiVersion(apiVersion) {
  return Number(apiVersion) === THEME_PACKAGE_API_VERSION;
}
