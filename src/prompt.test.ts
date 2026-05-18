import { describe, expect, it } from "vitest";
import { REVIEW_PROMPT_FILE_CHAR_LIMIT, buildReviewPromptBundle } from "./prompt.js";
import { defaultConfig } from "./config.js";
import { fixtureRoot, writeFixture } from "./test-helpers.js";
import type { FeatureRecord, ProjectRecord } from "./types.js";

describe("review prompt provenance", () => {
  it("records included, omitted, and truncated review prompt context", async () => {
    const root = await fixtureRoot("clawpatch-prompt-provenance-");
    await writeFixture(root, "src/index.ts", "export const value = 1;\n");
    await writeFixture(root, "src/extra.ts", "export const extra = 1;\n");
    await writeFixture(root, "tests/index.test.ts", "expect(1).toBe(1);\n");
    await writeFixture(root, "docs/large.md", `${"x".repeat(24_100)}\n`);
    const bundle = await buildReviewPromptBundle(root, project(root), feature(), {
      ...defaultConfig(),
      review: {
        ...defaultConfig().review,
        maxOwnedFiles: 1,
        maxContextFiles: 2,
      },
    });

    expect(bundle.prompt).toContain("Prompt context:");
    expect(bundle.prompt).toContain("--- src/index.ts");
    expect(bundle.prompt).toContain("--- tests/index.test.ts");
    expect(bundle.prompt).not.toContain("--- src/extra.ts");
    expect(bundle.manifest.includedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "src/index.ts", role: "owned", truncated: false }),
        expect.objectContaining({ path: "docs/large.md", role: "context", truncated: true }),
      ]),
    );
    expect(bundle.manifest.omittedFiles).toEqual([
      { path: "src/extra.ts", role: "owned", reason: "maxOwnedFiles" },
      { path: "docs/omitted.md", role: "context", reason: "maxContextFiles" },
    ]);
    expect(bundle.manifest.promptBytes).toBeGreaterThan(0);
    expect(bundle.manifest.approximateTokens).toBeGreaterThan(0);
  });

  it("marks exact marker-length replacements as truncated", async () => {
    const root = await fixtureRoot("clawpatch-prompt-truncated-edge-");
    await writeFixture(root, "src/index.ts", "export const value = 1;\n");
    await writeFixture(
      root,
      "docs/large.md",
      `${"x".repeat(REVIEW_PROMPT_FILE_CHAR_LIMIT)}TAIL_ONLY_TOKEN`,
    );
    const bundle = await buildReviewPromptBundle(root, project(root), feature(), defaultConfig());

    expect(bundle.manifest.includedFiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "docs/large.md", truncated: true })]),
    );
  });
});

function project(root: string): ProjectRecord {
  return {
    schemaVersion: 1,
    projectId: "proj_prompt",
    name: "prompt",
    rootPath: root,
    git: {
      remoteUrl: null,
      defaultBranch: null,
      currentBranch: null,
      headSha: null,
    },
    detected: {
      languages: ["typescript"],
      frameworks: [],
      packageManagers: ["npm"],
      commands: defaultConfig().commands,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function feature(): FeatureRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    featureId: "feat_prompt",
    title: "Prompt feature",
    summary: "Prompt provenance feature",
    kind: "library",
    source: "test",
    confidence: "high",
    entrypoints: [],
    ownedFiles: [
      { path: "src/index.ts", reason: "primary" },
      { path: "src/extra.ts", reason: "overflow" },
    ],
    contextFiles: [
      { path: "tests/index.test.ts", reason: "test" },
      { path: "docs/large.md", reason: "large doc" },
      { path: "docs/omitted.md", reason: "overflow" },
    ],
    tests: [],
    tags: [],
    trustBoundaries: [],
    status: "pending",
    lock: null,
    findingIds: [],
    patchAttemptIds: [],
    analysisHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}
