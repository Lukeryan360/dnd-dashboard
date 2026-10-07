// ============================================================
// urls.js
// Handles URL generation for D&D 5e 2024 Wikidot pages.
// ============================================================

const WIKI_BASE_URL = "https://dnd2024.wikidot.com";

// ------------------------------------------------------------
// URL Patterns
// ------------------------------------------------------------
// {slug} is replaced with the normalized name of the item.
//
// Add or modify patterns here if we discover that Wikidot uses
// different URL structures for certain page types.

const URL_PATTERNS = {
    class: "{slug}:main",
    subclass: "{parent}:{slug}",
    species: "species:{slug}",
    feat: "feat:{slug}",
    spell: "spell:{slug}",
    magic_item: "magic-item:{slug}"
};


// ------------------------------------------------------------
// Slug Generator
// ------------------------------------------------------------

function slugify(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")       // Remove apostrophes
        .replace(/&/g, "and")       // Replace & with "and"
        .replace(/[^a-z0-9]+/g, "-") // Replace other characters with -
        .replace(/^-+|-+$/g, "");   // Remove leading/trailing -
}


// ------------------------------------------------------------
// URL Generator
// ------------------------------------------------------------

function generateUrl(name, type, parent = null) {

    const pattern = URL_PATTERNS[type];

    // Make sure the requested type exists
    if (!pattern) {
        console.warn(`Unknown URL type: "${type}"`);
        return null;
    }

    const slug = slugify(name);

    // Some URL types require a parent.
    // Currently, this only applies to subclasses.
    if (pattern.includes("{parent}")) {

        if (!parent) {
            console.warn(
                `URL type "${type}" requires a parent.`
            );
            return null;
        }

        const parentSlug = slugify(parent);

        return `${WIKI_BASE_URL}/${pattern
            .replace("{parent}", parentSlug)
            .replace("{slug}", slug)}`;
    }

    // Standard URL
    return `${WIKI_BASE_URL}/${pattern.replace("{slug}", slug)}`;
}
