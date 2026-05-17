import { ClawpatchError } from "./errors.js";
import { stableId } from "./id.js";
import { deriveFindingTriage, FindingRecord, ReviewOutput } from "./types.js";
import { nowIso } from "./fs.js";

export function mergeFinding(
  existing: FindingRecord | null,
  incoming: FindingRecord,
): FindingRecord {
  if (existing === null) {
    return incoming;
  }
  return {
    ...incoming,
    status: existing.status,
    history: existing.history,
    linkedPatchAttemptIds: existing.linkedPatchAttemptIds,
    createdByRunId: existing.createdByRunId,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  };
}

export function appendFindingHistory(
  finding: FindingRecord,
  entry: FindingRecord["history"][number],
): FindingRecord {
  return { ...finding, history: [...finding.history, entry] };
}

export function parseFindingStatus(value: string): FindingRecord["status"] {
  if (
    value === "open" ||
    value === "false-positive" ||
    value === "fixed" ||
    value === "wont-fix" ||
    value === "uncertain"
  ) {
    return value;
  }
  throw new ClawpatchError(`invalid finding status: ${value}`, 2, "invalid-usage");
}

export function findingFromOutput(
  finding: ReviewOutput["findings"][number],
  featureId: string,
  currentRunId: string,
): FindingRecord {
  const signature = stableId("sig", [
    featureId,
    finding.category,
    finding.title,
    JSON.stringify(finding.evidence),
  ]);
  const now = nowIso();
  return {
    schemaVersion: 1,
    findingId: stableId("fnd", [signature]),
    featureId,
    title: finding.title,
    category: finding.category,
    severity: finding.severity,
    confidence: finding.confidence,
    triage: deriveFindingTriage(finding.category, finding.confidence),
    evidence: finding.evidence,
    reasoning: finding.reasoning,
    reproduction: finding.reproduction,
    recommendation: finding.recommendation,
    whyTestsDoNotAlreadyCoverThis: finding.whyTestsDoNotAlreadyCoverThis,
    suggestedRegressionTest: finding.suggestedRegressionTest,
    minimumFixScope: finding.minimumFixScope,
    status: "open",
    history: [],
    signature,
    linkedPatchAttemptIds: [],
    createdByRunId: currentRunId,
    createdAt: now,
    updatedAt: now,
  };
}
