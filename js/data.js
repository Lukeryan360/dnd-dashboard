// ============================================================
// data.js
// Loads and normalizes character data from individual JSON files.
// ============================================================

import { generateUrl } from "./urls.js";

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


// ------------------------------------------------------------
// Normalize Individual Item
// ------------------------------------------------------------
// Accepts either:
//
// "Fey Touched"
//
// OR
//
// {
//     "name": "All-Purpose Tool",
//     "url": "https://..."
// }
//
// A manually specified URL always takes priority over an
// automatically generated URL.

/**
 * Normalizes an individual item (spell, feat, etc.) into a consistent object.
 * @param {string|Object} item - The raw item data.
 * @param {string} type - The type of item (e.g., "spell", "feat").
 * @param {string} [parent] - Optional parent name for URL generation.
 * @returns {NormalizedItem|null}
 */
function normalizeItem(item, type, parent = null) {

    // Simple string
    if (typeof item === "string") {
        return {
            name: item,
            type: type,
            url: generateUrl(item, type, parent)
        };
    }

    // Object
    if (
        typeof item === "object" &&
        item !== null &&
        typeof item.name === "string"
    ) {
        return {
            name: item.name,
            type: type,
            url: item.url ?? generateUrl(item.name, type, parent)
        };
    }

    // Invalid data
    console.warn(`Invalid ${type}:`, item);
    return null;
}


// ------------------------------------------------------------
// Normalize List
// ------------------------------------------------------------

/**
 * Normalizes a list of items.
 * @param {Array} items - The raw list of items.
 * @param {string} type - The type of items.
 * @param {string} [parent] - Optional parent name.
 * @returns {NormalizedItem[]}
 */
function normalizeList(items, type, parent = null) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(item => normalizeItem(item, type, parent))
        .filter(item => item !== null);
}


// ------------------------------------------------------------
// Normalize Theme
// ------------------------------------------------------------

/**
 * Normalizes the character theme (accent color).
 * @param {Object} theme - The raw theme data.
 * @returns {NormalizedTheme}
 */
function normalizeTheme(theme) {
    const DEFAULT_ACCENT = "#8b1e2d";

    if (!theme || typeof theme.accent !== "string") {
        return { accent: DEFAULT_ACCENT };
    }

    // Simple hex validation (#RRGGBB)
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    const isValid = hexRegex.test(theme.accent);

    return {
        accent: isValid ? theme.accent : DEFAULT_ACCENT
    };
}


// ------------------------------------------------------------
// Normalize Character
// ------------------------------------------------------------

/**
 * Normalizes raw character data from JSON into a structured Character object.
 * @param {Object} raw - The raw character data.
 * @returns {Character}
 */
function normalizeCharacter(raw) {
    const character = {
        name: raw.name ?? "",
        id: raw.id ?? "",
        group: raw.group ?? null,
        level: raw.level ?? null,

        class: normalizeItem(raw.class, "class"),

        subclass: normalizeItem(
            raw.subclass,
            "subclass",
            typeof raw.class === "string"
                ? raw.class
                : raw.class?.name
        ),

        species: normalizeItem(raw.species, "species"),

        feats: normalizeList(
            raw.feats,
            "feat"
        ),

        spells: {},

        magic_items: normalizeList(
            raw.magic_items,
            "magic_item"
        ),
        theme: normalizeTheme(raw.theme)
    };


    // Normalize each spell level
    if (raw.spells) {
        for (const [level, spells] of Object.entries(raw.spells)) {
            character.spells[level] = normalizeList(
                spells,
                "spell"
            );
        }
    }

    return character;
}