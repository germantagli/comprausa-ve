import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const skip = new Set(["node_modules", ".git", "dist", ".next", ".expo", "coverage", ".turbo"]);
const patterns: { name: string; expression: RegExp }[] = [
  { name: "stripe_live", expression: /(?:sk|rk)_live_[A-Za-z0-9]{8,}/g },
  { name: "stripe_test", expression: /sk_test_[A-Za-z0-9]{8,}/g },
  { name: "stripe_webhook", expression: /whsec_[A-Za-z0-9]{24,}/g },
  { name: "aws_access_key", expression: /AKIA[0-9A-Z]{16}/g },
  { name: "private_key", expression: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: "github_token", expression: /ghp_[A-Za-z0-9]{20,}/g },
];

function files(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) {
      continue;
    }
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) {
      found.push(...files(path));
    } else if (info.isFile() && info.size > 0 && info.size < 1_000_000) {
      found.push(path);
    }
  }
  return found;
}

describe("repository secrets", () => {
  it("does not contain a live provider key", () => {
    const hits: string[] = [];
    for (const path of files(root)) {
      const bytes = readFileSync(path);
      if (bytes.includes(0)) {
        continue;
      }
      const text = bytes.toString("utf8");
      for (const pattern of patterns) {
        pattern.expression.lastIndex = 0;
        if (pattern.expression.test(text)) {
          hits.push(`${pattern.name} ${relative(root, path)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
