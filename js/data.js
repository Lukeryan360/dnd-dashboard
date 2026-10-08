// ============================================================
// data.js
// Loads and normalizes character data from character.json.
// ============================================================

const CHARACTER_DATA_PATH = "data/character.json";

// ------------------------------------------------------------
// Load Characters
// ------------------------------------------------------------

async function loadCharacters() {
    try {
        const response = await fetch(CHARACTER_DATA_PATH);

        if (!response.ok) {
            throw new Error(
                `Failed to load character data: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.characters)) {
            throw new Error("Invalid character data format: expected an array.");
        }

        return data.characters.map(normalizeCharacter);

    } catch (error) {
        console.error("Error loading characters:", error);
        return [];
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

function normalizeCharacter(raw) {

    const character = {
        name: raw.name ?? "",
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