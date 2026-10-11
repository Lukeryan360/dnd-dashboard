// ============================================================
// data.js
// Loads and normalizes character data from individual JSON files.
// ============================================================

import { normalizeCharacter } from "./character-utils.js";

const CHARACTER_MANIFEST_PATH = "data/characters/index.json";
const REFS_DATA_PATH = "data/refs.json";

/**
 * @typedef {Object} NormalizedItem
 * @property {string} name
 * @property {string} type
 * @property {string} url
 */

/**
 * @typedef {Object} NormalizedTheme
 * @property {string} accent
 */

/**
 * @typedef {Object} Character
 * @property {string} name
 * @property {string} id
 * @property {string|null} group
 * @property {number|null} level
 * @property {NormalizedItem|null} class
 * @property {NormalizedItem|null} subclass
 * @property {NormalizedItem|null} species
 * @property {NormalizedItem[]} feats
 * @property {Object.<string, NormalizedItem[]>} spells
 * @property {NormalizedItem[]} magic_items
 * @property {NormalizedTheme} theme
 */

// ------------------------------------------------------------
// Load Characters
// ------------------------------------------------------------

/**
 * Loads character data from the individual JSON files referenced in the manifest and normalizes it.
 * @returns {Promise<Character[]>}
 */
export async function loadCharacters() {
    try {
        const manifestResponse = await fetch(CHARACTER_MANIFEST_PATH);

        if (!manifestResponse.ok) {
            throw new Error(
                `Failed to load character manifest: ${manifestResponse.status}`
            );
        }

        const manifest = await manifestResponse.json();

        if (!Array.isArray(manifest.characters)) {
            throw new Error("Invalid manifest format: expected a 'characters' array.");
        }

        const characterPromises = manifest.characters.map(async (filename) => {
            try {
                // Resolve path relative to manifest directory
                const path = `data/characters/${filename}`;
                const response = await fetch(path);

                if (!response.ok) {
                    throw new Error(`Failed to load character file ${filename}: ${response.status}`);
                }

                const rawCharacter = await response.json();
                return normalizeCharacter(rawCharacter);
            } catch (error) {
                console.error(`Error loading character from ${filename}:`, error);
                return null;
            }
        });

        const characters = await Promise.all(characterPromises);
        
        // Filter out any characters that failed to load
        return characters.filter(c => c !== null);

    } catch (error) {
        console.error("Error loading characters:", error);
        throw error;
    }
}


// ------------------------------------------------------------
// Load References
// ------------------------------------------------------------

/**
 * Loads reference data from the local JSON file.
 * @returns {Promise<Object[]>}
 */
export async function loadReferences() {
    try {
        const response = await fetch(REFS_DATA_PATH);

        if (!response.ok) {
            throw new Error(
                `Failed to load reference data: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid reference data format: expected an array.");
        }

        return data;

    } catch (error) {
        console.error("Error loading references:", error);
        throw error;
    }
}

