/**
 * ZK proof generation using Noir + Barretenberg + Garaga CLI tools.
 *
 * Two operations:
 *   1. Commitment computation: nargo execute on the commitment helper circuit
 *   2. Proof generation: nargo execute + bb prove + garaga calldata on the main circuit
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Starknet felt252 prime: P = 2^251 + 17 * 2^192 + 1
const STARK_PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;

// Circuit directories
const MAIN_CIRCUIT_DIR = path.resolve(__dirname, '../../circuits/tweetle_wordle');
const COMMITMENT_CIRCUIT_DIR = path.resolve(__dirname, '../../circuits/tweetle_commitment');
const MAIN_TARGET_DIR = path.join(MAIN_CIRCUIT_DIR, 'target');
const VK_PATH = path.join(MAIN_TARGET_DIR, 'vk', 'vk');

// Ensure PATH includes nargo and bb
const TOOL_PATH = `${process.env.HOME}/.nargo/bin:${process.env.HOME}/.bb:${process.env.PATH}`;
const ENV = { ...process.env, PATH: TOOL_PATH, ASDF_SCARB_VERSION: '2.13.1' };

export interface ProofInput {
  solution: number[]; // 5 ASCII bytes
  salt: string; // Field as decimal or hex string
  commitment: string; // Field as hex string (0x...)
  guess: number[]; // 5 ASCII bytes
  clue: number[]; // 5 clue values (0/1/2)
  cluePacked: number;
}

export interface ProofResult {
  calldata: string[]; // Array of felt252 strings for Starknet
}

/**
 * Compute the Poseidon2 commitment for a solution word + salt.
 * Uses the tweetle_commitment helper circuit via nargo.
 */
export async function computeCommitment(
  solution: number[],
  salt: string,
): Promise<string> {
  // Write Prover.toml for the commitment circuit
  const proverToml = `solution = [${solution.join(', ')}]\nsalt = "${salt}"\n`;
  fs.writeFileSync(path.join(COMMITMENT_CIRCUIT_DIR, 'Prover.toml'), proverToml);

  // Run nargo execute — it prints "Circuit output: 0x..." to stdout
  const { stdout } = await exec('nargo', ['execute', '--silence-warnings'], {
    cwd: COMMITMENT_CIRCUIT_DIR,
    env: ENV,
  });

  // Extract the commitment hex from output
  const match = stdout.match(/Circuit output:\s*(0x[0-9a-fA-F]+)/);
  if (!match) {
    throw new Error(`Failed to extract commitment from nargo output: ${stdout}`);
  }

  // Verify the commitment fits in felt252. Noir's Poseidon2 operates on BN254
  // which can produce values up to ~2^254, but Starknet's felt252 max is ~2^251.
  // If the value overflows, the caller should retry with a different salt.
  const val = BigInt(match[1]);
  if (val >= STARK_PRIME) {
    throw new CommitmentOverflowError(match[1]);
  }

  return match[1];
}

export class CommitmentOverflowError extends Error {
  constructor(public readonly commitment: string) {
    super('Commitment exceeds felt252 range — retry with a different salt');
  }
}

/**
 * Generate a ZK proof and Starknet calldata for a single guess.
 */
export async function generateProof(input: ProofInput): Promise<ProofResult> {
  // 1. Write Prover.toml for the main circuit
  const proverToml = buildProverToml(input);
  fs.writeFileSync(path.join(MAIN_CIRCUIT_DIR, 'Prover.toml'), proverToml);

  // 2. Generate witness with nargo
  await exec('nargo', ['execute', '--silence-warnings'], {
    cwd: MAIN_CIRCUIT_DIR,
    env: ENV,
  });

  // 3. Clean up old proof output directory (bb crashes if it already exists)
  const proofDir = path.join(MAIN_TARGET_DIR, 'proof_out');
  try { fs.rmSync(proofDir, { recursive: true }); } catch {}

  // 4. Generate proof with bb (must use -k flag for Apple Silicon bug workaround)
  //    bb creates a directory at -o path with proof and public_inputs files inside
  await exec('bb', [
    'prove',
    '-s', 'ultra_honk',
    '--oracle_hash', 'keccak',
    '-b', path.join(MAIN_TARGET_DIR, 'tweetle_wordle.json'),
    '-w', path.join(MAIN_TARGET_DIR, 'tweetle_wordle.gz'),
    '-k', VK_PATH,
    '-o', proofDir,
  ], { env: ENV });

  // 5. Generate Starknet calldata with garaga
  const garagaPath = path.join(
    process.env.HOME!,
    '.pyenv/versions/3.10.19/bin/garaga',
  );
  const { stdout } = await exec(garagaPath, [
    'calldata',
    '--system', 'ultra_keccak_zk_honk',
    '--proof', path.join(proofDir, 'proof'),
    '--vk', VK_PATH,
    '--public-inputs', path.join(proofDir, 'public_inputs'),
    '--format', 'array',
  ], {
    env: ENV,
    maxBuffer: 2 * 1024 * 1024, // 2MB for large calldata
  });

  const calldata = parseGaragaOutput(stdout);
  return { calldata };
}

function buildProverToml(input: ProofInput): string {
  const lines: string[] = [];
  lines.push(`solution = [${input.solution.join(', ')}]`);
  lines.push(`salt = "${input.salt}"`);
  lines.push(`commitment = "${input.commitment}"`);
  lines.push(`guess = [${input.guess.join(', ')}]`);
  lines.push(`clue = [${input.clue.join(', ')}]`);
  lines.push(`clue_packed = "${input.cluePacked}"`);
  return lines.join('\n') + '\n';
}

function parseGaragaOutput(stdout: string): string[] {
  const trimmed = stdout.trim();

  // Extract values from bracket notation as raw strings.
  // Do NOT use JSON.parse — it converts large integers to floats, losing precision.
  const match = trimmed.match(/\[([^\]]+)\]/s);
  if (match) {
    return match[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Split by newlines
  return trimmed.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
}
