import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";

export interface ProofStorage {
  put(bytes: Buffer): Promise<{ storageKey: string }>;
}

@Injectable()
export class MemoryProofStorage implements ProofStorage {
  readonly objects = new Map<string, Buffer>();

  async put(bytes: Buffer): Promise<{ storageKey: string }> {
    const storageKey = randomBytes(16).toString("hex");
    this.objects.set(storageKey, Buffer.from(bytes));
    return { storageKey };
  }
}

/** Development disk. The key is random hex, without the caller's filename and without an execute bit. */
export class LocalDiskProofStorage implements ProofStorage {
  constructor(private readonly root = join(tmpdir(), "comprausa-proofs")) {}

  async put(bytes: Buffer): Promise<{ storageKey: string }> {
    const storageKey = randomBytes(16).toString("hex");
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, storageKey), bytes, { mode: 0o600 });
    return { storageKey };
  }
}

/**
 * Port for object storage. This class does not read credentials and does not upload.
 * A later adapter can replace it when a bucket exists outside the repository.
 */
export class S3ProofStorage implements ProofStorage {
  async put(): Promise<{ storageKey: string }> {
    throw new Error("s3_not_configured");
  }
}

export const PROOF_STORAGE = Symbol("PROOF_STORAGE");
