const VERSION = "v1";

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value));
}

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("ANALYTICS_CREDENTIAL_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) {
    throw new Error("Analytics credential encryption is not configured. Set ANALYTICS_CREDENTIAL_ENCRYPTION_KEY (32+ characters) before connecting providers.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptCredential(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getKey(), new TextEncoder().encode(value));
  return `${VERSION}:${encodeBase64(iv)}:${encodeBase64(new Uint8Array(encrypted))}`;
}

export async function decryptCredential(value: string): Promise<string> {
  const [version, ivValue, encryptedValue] = value.split(":");
  if (version !== VERSION || !ivValue || !encryptedValue) {
    throw new Error("Stored analytics credential requires secure migration before it can be used.");
  }
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64(ivValue) }, await getKey(), decodeBase64(encryptedValue));
  return new TextDecoder().decode(decrypted);
}
