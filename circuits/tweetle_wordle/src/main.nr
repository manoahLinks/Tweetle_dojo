use std::hash::poseidon2_permutation;

// Tweetle Wordle per-guess verification circuit.
//
// Proves that a given clue is the correct Wordle evaluation of a guess
// against a secret solution, without revealing the solution.
//
// The clue encoding matches the Cairo contract (actions.cairo):
//   clue_packed = s0*256 + s1*64 + s2*16 + s3*4 + s4
//   where each s_i is: 0=absent, 1=present (wrong position), 2=correct
//   All correct = 682

fn main(
    // Private inputs (known only to the prover / game master)
    solution: [u8; 5],  // Secret 5-letter word as ASCII bytes
    salt: Field,        // Random salt for commitment

    // Public inputs (visible on-chain, verified by Garaga)
    commitment: pub Field,   // poseidon2(pack(solution), salt) stored on-chain
    guess: pub [u8; 5],      // Player's guess word as ASCII bytes
    clue: pub [u8; 5],       // Per-letter clue: 0=absent, 1=present, 2=correct
    clue_packed: pub u32,    // Packed clue for on-chain storage
) {
    // 1. Verify the solution matches the on-chain commitment
    let sol_packed = pack_word(solution);
    let computed_commitment = poseidon2_hash_two(sol_packed, salt);
    assert(computed_commitment == commitment, "Solution does not match commitment");

    // 2. Compute the expected clue using Wordle rules
    //    (exactly mirrors compare_words in actions.cairo:159-219)
    let expected_clue = compute_clue(solution, guess);

    // 3. Assert the provided clue matches the computed clue
    for i in 0..5 {
        assert(clue[i] == expected_clue[i], "Clue mismatch");
    }

    // 4. Verify clue_packed matches the base-4 encoding
    //    s0*256 + s1*64 + s2*16 + s3*4 + s4
    let expected_packed: u32 = (clue[0] as u32) * 256
        + (clue[1] as u32) * 64
        + (clue[2] as u32) * 16
        + (clue[3] as u32) * 4
        + (clue[4] as u32);
    assert(clue_packed == expected_packed, "Packed clue mismatch");
}

// Hash two Field elements using Poseidon2 permutation (sponge construction).
// State width = 4, rate = 3. We absorb 2 elements, then squeeze 1.
// Initial state: [a, b, 0, 0] with state_len = 4
fn poseidon2_hash_two(a: Field, b: Field) -> Field {
    let input: [Field; 4] = [a, b, 0, 0];
    let output = poseidon2_permutation(input, 4);
    output[0]
}

// Pack 5 ASCII bytes into a single Field element.
// Matches felt_to_bytes5 / stringToFelt encoding:
//   packed = b0 * 256^4 + b1 * 256^3 + b2 * 256^2 + b3 * 256 + b4
fn pack_word(word: [u8; 5]) -> Field {
    let mut packed: Field = 0;
    for i in 0..5 {
        packed = packed * 256 + word[i] as Field;
    }
    packed
}

// Compute Wordle clue from solution and guess.
// Returns per-letter values: 0=absent, 1=present (wrong position), 2=correct.
//
// This MUST exactly mirror compare_words() in actions.cairo:159-219:
//   - First pass: mark exact matches (2=correct), flag target positions as used
//   - Second pass: for each non-exact guess letter, scan target positions
//     left-to-right for an unused match (1=present)
fn compute_clue(solution: [u8; 5], guess: [u8; 5]) -> [u8; 5] {
    let mut result: [u8; 5] = [0; 5];
    let mut used: [bool; 5] = [false; 5];

    // First pass: exact matches (green / correct position)
    for i in 0..5 {
        if guess[i] == solution[i] {
            result[i] = 2;
            used[i] = true;
        }
    }

    // Second pass: wrong-position matches (yellow / present)
    // Mirrors the Cairo if-else chain exactly:
    //   For guess position i (if not already correct),
    //   check solution positions 0,1,2,3,4 in order.
    //   First unused match wins.

    // Position 0
    if result[0] == 0 {
        if (!used[0]) & (guess[0] == solution[0]) {
            result[0] = 1;
            used[0] = true;
        } else if (!used[1]) & (guess[0] == solution[1]) {
            result[0] = 1;
            used[1] = true;
        } else if (!used[2]) & (guess[0] == solution[2]) {
            result[0] = 1;
            used[2] = true;
        } else if (!used[3]) & (guess[0] == solution[3]) {
            result[0] = 1;
            used[3] = true;
        } else if (!used[4]) & (guess[0] == solution[4]) {
            result[0] = 1;
            used[4] = true;
        }
    }

    // Position 1
    if result[1] == 0 {
        if (!used[0]) & (guess[1] == solution[0]) {
            result[1] = 1;
            used[0] = true;
        } else if (!used[1]) & (guess[1] == solution[1]) {
            result[1] = 1;
            used[1] = true;
        } else if (!used[2]) & (guess[1] == solution[2]) {
            result[1] = 1;
            used[2] = true;
        } else if (!used[3]) & (guess[1] == solution[3]) {
            result[1] = 1;
            used[3] = true;
        } else if (!used[4]) & (guess[1] == solution[4]) {
            result[1] = 1;
            used[4] = true;
        }
    }

    // Position 2
    if result[2] == 0 {
        if (!used[0]) & (guess[2] == solution[0]) {
            result[2] = 1;
            used[0] = true;
        } else if (!used[1]) & (guess[2] == solution[1]) {
            result[2] = 1;
            used[1] = true;
        } else if (!used[2]) & (guess[2] == solution[2]) {
            result[2] = 1;
            used[2] = true;
        } else if (!used[3]) & (guess[2] == solution[3]) {
            result[2] = 1;
            used[3] = true;
        } else if (!used[4]) & (guess[2] == solution[4]) {
            result[2] = 1;
            used[4] = true;
        }
    }

    // Position 3
    if result[3] == 0 {
        if (!used[0]) & (guess[3] == solution[0]) {
            result[3] = 1;
            used[0] = true;
        } else if (!used[1]) & (guess[3] == solution[1]) {
            result[3] = 1;
            used[1] = true;
        } else if (!used[2]) & (guess[3] == solution[2]) {
            result[3] = 1;
            used[2] = true;
        } else if (!used[3]) & (guess[3] == solution[3]) {
            result[3] = 1;
            used[3] = true;
        } else if (!used[4]) & (guess[3] == solution[4]) {
            result[3] = 1;
            used[4] = true;
        }
    }

    // Position 4
    if result[4] == 0 {
        if (!used[0]) & (guess[4] == solution[0]) {
            result[4] = 1;
            used[0] = true;
        } else if (!used[1]) & (guess[4] == solution[1]) {
            result[4] = 1;
            used[1] = true;
        } else if (!used[2]) & (guess[4] == solution[2]) {
            result[4] = 1;
            used[2] = true;
        } else if (!used[3]) & (guess[4] == solution[3]) {
            result[4] = 1;
            used[3] = true;
        } else if (!used[4]) & (guess[4] == solution[4]) {
            result[4] = 1;
            used[4] = true;
        }
    }

    result
}

// Helper to compute commitment for testing/server use
fn compute_commitment(solution: [u8; 5], salt: Field) -> Field {
    let packed = pack_word(solution);
    poseidon2_hash_two(packed, salt)
}

// =============== Tests ===============

#[test]
fn test_all_correct() {
    // "crane" vs "crane" -> all correct [2,2,2,2,2], packed = 682
    let solution: [u8; 5] = [99, 114, 97, 110, 101]; // c r a n e
    let guess: [u8; 5] = [99, 114, 97, 110, 101];    // c r a n e
    let clue = compute_clue(solution, guess);
    assert(clue == [2, 2, 2, 2, 2]);
    let packed: u32 = 2 * 256 + 2 * 64 + 2 * 16 + 2 * 4 + 2;
    assert(packed == 682);
}

#[test]
fn test_all_absent() {
    // "crane" vs "blots" -> all absent [0,0,0,0,0], packed = 0
    let solution: [u8; 5] = [99, 114, 97, 110, 101];  // c r a n e
    let guess: [u8; 5] = [98, 108, 111, 116, 115];    // b l o t s
    let clue = compute_clue(solution, guess);
    assert(clue == [0, 0, 0, 0, 0]);
}

#[test]
fn test_mixed_clue() {
    // "crane" vs "trace" -> t=absent, r=correct, a=correct, c=present, e=correct
    // Expected: [0, 2, 2, 1, 2]
    // Packed: 0*256 + 2*64 + 2*16 + 1*4 + 2 = 0 + 128 + 32 + 4 + 2 = 166
    let solution: [u8; 5] = [99, 114, 97, 110, 101];  // c r a n e
    let guess: [u8; 5] = [116, 114, 97, 99, 101];     // t r a c e
    let clue = compute_clue(solution, guess);
    assert(clue == [0, 2, 2, 1, 2]);
}

#[test]
fn test_duplicate_letters_in_guess() {
    // "crane" vs "creep" -> c=correct, r=correct, e=present, e=absent, p=absent
    // The first 'e' at position 2 should match the 'e' at solution position 4 (present)
    // The second 'e' at position 3 should NOT match (already used)
    // Expected: [2, 2, 1, 0, 0]
    let solution: [u8; 5] = [99, 114, 97, 110, 101];  // c r a n e
    let guess: [u8; 5] = [99, 114, 101, 101, 112];    // c r e e p
    let clue = compute_clue(solution, guess);
    assert(clue == [2, 2, 1, 0, 0]);
}

#[test]
fn test_duplicate_letters_in_solution() {
    // "llama" vs "hello"
    // solution = [108, 108, 97, 109, 97] (l l a m a)
    // guess    = [104, 101, 108, 108, 111] (h e l l o)
    // First pass: no exact matches
    // Second pass pos 0 (h): no match -> 0
    // Second pass pos 1 (e): no match -> 0
    // Second pass pos 2 (l): matches solution[0] -> 1
    // Second pass pos 3 (l): matches solution[1] -> 1
    // Second pass pos 4 (o): no match -> 0
    // Expected: [0, 0, 1, 1, 0]
    let solution: [u8; 5] = [108, 108, 97, 109, 97];  // l l a m a
    let guess: [u8; 5] = [104, 101, 108, 108, 111];   // h e l l o
    let clue = compute_clue(solution, guess);
    assert(clue == [0, 0, 1, 1, 0]);
}

#[test]
fn test_pack_word() {
    // "crane" = [99, 114, 97, 110, 101]
    // packed = 99*256^4 + 114*256^3 + 97*256^2 + 110*256 + 101
    let word: [u8; 5] = [99, 114, 97, 110, 101];
    let packed = pack_word(word);
    let expected: Field = 427120750181;
    assert(packed == expected);
}
