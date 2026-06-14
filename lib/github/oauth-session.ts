import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

export const GITHUB_AUTH_STATE_COOKIE = "cp_github_oauth_state";
export const GITHUB_CODE_VERIFIER_COOKIE = "cp_github_code_verifier";
export const GITHUB_TOKEN_COOKIE = "cp_github_token";
export const GITHUB_USER_COOKIE = "cp_github_user";

const TOKEN_VERSION = "v1";
const SESSION_SALT = "complypatch-github-oauth-session";

export function githubCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function clearGithubCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

export function encryptGitHubToken(token: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [TOKEN_VERSION, toBase64Url(iv), toBase64Url(tag), toBase64Url(encrypted)].join(".");
}

export function decryptGitHubToken(value?: string) {
  if (!value) return null;

  try {
    const [version, ivValue, tagValue, encryptedValue] = value.split(".");
    if (version !== TOKEN_VERSION || !ivValue || !tagValue || !encryptedValue) return null;

    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), fromBase64Url(ivValue));
    decipher.setAuthTag(fromBase64Url(tagValue));
    const decrypted = Buffer.concat([decipher.update(fromBase64Url(encryptedValue)), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function requireGitHubSessionSecret() {
  const secret = process.env.GITHUB_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("GITHUB_SESSION_SECRET must be set to at least 32 characters for GitHub login");
  }
  return secret;
}

function getEncryptionKey() {
  return scryptSync(requireGitHubSessionSecret(), SESSION_SALT, 32);
}

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}
