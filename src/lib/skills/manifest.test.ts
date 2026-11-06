import { describe, expect, it } from "vitest";
import {
  INVALID_SKILL_MANIFEST_MESSAGE,
  parseGithubSkillSource,
  validateSkillManifest,
} from "./manifest";

describe("skill manifest validation", () => {
  it("accepts the required manifest fields and supplies a default version", () => {
    expect(validateSkillManifest({
      name: "Context7 Docs",
      description: "Lookup library documentation.",
      tools: ["search_docs"],
      agent: "SCOUT",
    })).toEqual({
      ok: true,
      manifest: {
        name: "Context7 Docs",
        description: "Lookup library documentation.",
        tools: ["search_docs"],
        agent: "SCOUT",
        version: "1.0.0",
      },
    });
  });

  it("rejects a manifest missing required fields with the requested message", () => {
    expect(validateSkillManifest({ name: "Incomplete skill" })).toEqual({
      ok: false,
      message: INVALID_SKILL_MANIFEST_MESSAGE,
    });
  });
});

describe("GitHub skill source", () => {
  it("always resolves a repository to its main-branch skill.json", () => {
    expect(parseGithubSkillSource("https://github.com/example/skill-pack/tree/main/docs"))
      .toEqual({
        owner: "example",
        repository: "skill-pack",
        repositoryUrl: "https://github.com/example/skill-pack",
        manifestUrl: "https://raw.githubusercontent.com/example/skill-pack/main/skill.json",
      });
  });

  it("rejects non-GitHub and non-HTTPS URLs", () => {
    expect(parseGithubSkillSource("http://github.com/example/skill-pack")).toBeNull();
    expect(parseGithubSkillSource("https://github.com.evil.example/example/skill-pack")).toBeNull();
    expect(parseGithubSkillSource("https://example.com/example/skill-pack")).toBeNull();
  });
});
