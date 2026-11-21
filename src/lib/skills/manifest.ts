export const INVALID_SKILL_MANIFEST_MESSAGE = "No valid skill manifest found. Add a skill.json to your repo root.";

export interface SkillManifest {
  name: string;
  description: string;
  agent: string;
  tools: Array<string | Record<string, unknown>>;
  version: string;
}

export type SkillManifestValidation =
  | { ok: true; manifest: SkillManifest }
  | { ok: false; message: string };

export interface GithubSkillSource {
  owner: string;
  repository: string;
  repositoryUrl: string;
  manifestUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function validateSkillManifest(value: unknown): SkillManifestValidation {
  if (!isRecord(value)) return { ok: false, message: INVALID_SKILL_MANIFEST_MESSAGE };

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const agent = typeof value.agent === "string" ? value.agent.trim() : "";
  const tools = value.tools;
  const validTools = Array.isArray(tools)
    && tools.length > 0
    && tools.every((tool) => typeof tool === "string" || isRecord(tool));

  if (
    !name || name.length > 120
    || !description || description.length > 2000
    || !agent || agent.length > 60
    || !validTools
  ) {
    return { ok: false, message: INVALID_SKILL_MANIFEST_MESSAGE };
  }

  const version = typeof value.version === "string" && value.version.trim()
    ? value.version.trim().slice(0, 32)
    : "1.0.0";

  return {
    ok: true,
    manifest: {
      name,
      description,
      agent,
      tools: tools as Array<string | Record<string, unknown>>,
      version,
    },
  };
}

export function parseGithubSkillSource(input: string): GithubSkillSource | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const owner = segments[0];
    const repository = segments[1].replace(/\.git$/i, "");
    const validSegment = /^[A-Za-z0-9_.-]{1,100}$/;
    if (!validSegment.test(owner) || !validSegment.test(repository)) return null;

    return {
      owner,
      repository,
      repositoryUrl: `https://github.com/${owner}/${repository}`,
      manifestUrl: `https://raw.githubusercontent.com/${owner}/${repository}/main/skill.json`,
    };
  } catch {
    return null;
  }
}
