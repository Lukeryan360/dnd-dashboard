import { generateUrl, slugify } from "./urls.js";

export const DEFAULT_ACCENT = "#8b1e2d";

export const STANDARD_SPELL_LEVELS = [
    { key: "cantrips", label: "Cantrips" },
    { key: "level_1", label: "Level 1" },
    { key: "level_2", label: "Level 2" },
    { key: "level_3", label: "Level 3" },
    { key: "level_4", label: "Level 4" },
    { key: "level_5", label: "Level 5" },
    { key: "level_6", label: "Level 6" },
    { key: "level_7", label: "Level 7" },
    { key: "level_8", label: "Level 8" },
    { key: "level_9", label: "Level 9" }
];

const SUPPORTED_FIELDS = new Set([
    "id",
    "name",
    "group",
    "theme",
    "level",
    "class",
    "subclass",
    "species",
    "feats",
    "spells",
    "magic_items"
]);

const LINKED_SCALAR_FIELDS = new Set([
    "class",
    "subclass",
    "species"
]);

const LIST_FIELDS = new Set([
    "feats",
    "magic_items"
]);

export function deepClone(value) {
    if (value === undefined) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHexColor(value) {
    if (typeof value !== "string") {
        return DEFAULT_ACCENT;
    }

    const trimmed = value.trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : DEFAULT_ACCENT;
}

export function slugifyCharacterId(name) {
    return slugify(name);
}

export function isValidCharacterId(id) {
    return typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

export function getSpellLevelLabel(levelKey) {
    const standardLevel = STANDARD_SPELL_LEVELS.find(level => level.key === levelKey);

    if (standardLevel) {
        return standardLevel.label;
    }

    const numericMatch = /^level_(\d+)$/.exec(levelKey);

    if (numericMatch) {
        return `Level ${numericMatch[1]}`;
    }

    return levelKey
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function extractEntryName(entry) {
    if (typeof entry === "string") {
        return entry;
    }

    if (isPlainObject(entry) && typeof entry.name === "string") {
        return entry.name;
    }

    return "";
}

export function normalizeItem(item, type, parent = null) {
    const name = extractEntryName(item).trim();

    if (!name) {
        console.warn(`Invalid ${type}:`, item);
        return null;
    }

    const customUrl = isPlainObject(item) && typeof item.url === "string"
        ? item.url.trim()
        : "";

    return {
        name,
        type,
        url: customUrl || generateUrl(name, type, parent),
        customUrl
    };
}

export function normalizeList(items, type, parent = null) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(item => normalizeItem(item, type, parent))
        .filter(item => item !== null);
}

export function normalizeTheme(theme) {
    return {
        accent: normalizeHexColor(theme?.accent)
    };
}

export function normalizeCharacter(raw) {
    const safeRaw = isPlainObject(raw) ? raw : {};
    const className = extractEntryName(safeRaw.class);

    const character = {
        name: typeof safeRaw.name === "string" ? safeRaw.name : "",
        id: typeof safeRaw.id === "string" ? safeRaw.id : "",
        group: typeof safeRaw.group === "string" ? safeRaw.group : null,
        level: typeof safeRaw.level === "number" ? safeRaw.level : null,
        class: normalizeItem(safeRaw.class, "class"),
        subclass: normalizeItem(safeRaw.subclass, "subclass", className || null),
        species: normalizeItem(safeRaw.species, "species"),
        feats: normalizeList(safeRaw.feats, "feat"),
        spells: {},
        magic_items: normalizeList(safeRaw.magic_items, "magic_item"),
        theme: normalizeTheme(safeRaw.theme)
    };

    if (isPlainObject(safeRaw.spells)) {
        for (const [level, spells] of Object.entries(safeRaw.spells)) {
            character.spells[level] = normalizeList(spells, "spell");
        }
    }

    Object.defineProperty(character, "raw", {
        value: deepClone(safeRaw),
        enumerable: false
    });

    return character;
}

export function getRawCharacter(character) {
    return deepClone(character?.raw ?? character ?? {});
}

export function validateRawCharacter(raw) {
    const errors = [];

    if (!isPlainObject(raw)) {
        return ["Character JSON must contain an object at the top level."];
    }

    if ("id" in raw && typeof raw.id !== "string") {
        errors.push("Character id must be a string.");
    }

    if ("name" in raw && typeof raw.name !== "string") {
        errors.push("Character name must be a string.");
    }

    if ("group" in raw && typeof raw.group !== "string") {
        errors.push("Group must be a string.");
    }

    if ("theme" in raw && !isPlainObject(raw.theme)) {
        errors.push("Theme must be an object.");
    }

    if (isPlainObject(raw.theme) && "accent" in raw.theme && typeof raw.theme.accent !== "string") {
        errors.push("Theme accent must be a hex color string.");
    }

    if ("level" in raw && (!Number.isInteger(raw.level) || raw.level < 1 || raw.level > 20)) {
        errors.push("Level must be a whole number from 1 to 20.");
    }

    for (const field of LINKED_SCALAR_FIELDS) {
        validateLinkedValue(raw[field], field, errors);
    }

    for (const field of LIST_FIELDS) {
        validateLinkedList(raw[field], field, errors);
    }

    if ("spells" in raw) {
        if (!isPlainObject(raw.spells)) {
            errors.push("Spells must be grouped in an object by spell level.");
        } else {
            for (const [level, spells] of Object.entries(raw.spells)) {
                validateLinkedList(spells, `spells.${level}`, errors);
            }
        }
    }

    return errors;
}

function validateLinkedValue(value, field, errors) {
    if (value === undefined) {
        return;
    }

    if (typeof value === "string") {
        return;
    }

    if (isPlainObject(value) && typeof value.name === "string") {
        if ("url" in value && typeof value.url !== "string") {
            errors.push(`${field} URL must be a string.`);
        }
        return;
    }

    errors.push(`${field} must be a string or an object with a name.`);
}

function validateLinkedList(value, field, errors) {
    if (value === undefined) {
        return;
    }

    if (!Array.isArray(value)) {
        errors.push(`${field} must be an array.`);
        return;
    }

    value.forEach((entry, index) => {
        const entryField = `${field}[${index + 1}]`;
        validateLinkedValue(entry, entryField, errors);
    });
}

export function createEmptyEditableCharacter() {
    const spells = {};

    for (const level of STANDARD_SPELL_LEVELS) {
        spells[level.key] = [];
    }

    return {
        id: "",
        originalId: "",
        name: "",
        group: "",
        theme: { accent: DEFAULT_ACCENT },
        level: "",
        class: { name: "", url: "" },
        subclass: { name: "", url: "" },
        species: { name: "", url: "" },
        feats: [],
        spells,
        magic_items: []
    };
}

export function createEditableCharacter(raw = {}) {
    const editable = createEmptyEditableCharacter();
    const safeRaw = isPlainObject(raw) ? raw : {};

    editable.id = typeof safeRaw.id === "string" ? safeRaw.id : "";
    editable.originalId = editable.id;
    editable.name = typeof safeRaw.name === "string" ? safeRaw.name : "";
    editable.group = typeof safeRaw.group === "string" ? safeRaw.group : "";
    editable.theme.accent = normalizeHexColor(safeRaw.theme?.accent);
    editable.level = Number.isInteger(safeRaw.level) ? String(safeRaw.level) : "";
    editable.class = editableEntryValue(safeRaw.class);
    editable.subclass = editableEntryValue(safeRaw.subclass);
    editable.species = editableEntryValue(safeRaw.species);
    editable.feats = editableEntryList(safeRaw.feats);
    editable.magic_items = editableEntryList(safeRaw.magic_items);

    const rawSpells = isPlainObject(safeRaw.spells) ? safeRaw.spells : {};

    for (const [level, spells] of Object.entries(rawSpells)) {
        if (!editable.spells[level]) {
            editable.spells[level] = [];
        }

        editable.spells[level] = editableEntryList(spells);
    }

    return editable;
}

function editableEntryList(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(entry => ({
            name: extractEntryName(entry),
            url: isPlainObject(entry) && typeof entry.url === "string" ? entry.url : ""
        }))
        .filter(entry => entry.name.trim() || entry.url.trim());
}

function editableEntryValue(entry) {
    return {
        name: extractEntryName(entry),
        url: isPlainObject(entry) && typeof entry.url === "string" ? entry.url : ""
    };
}

export function validateEditableCharacter(editable, options = {}) {
    const errors = [];
    const name = editable.name.trim();
    const id = editable.id.trim();
    const existingIds = options.existingIds ?? new Set();
    const originalId = options.originalId ?? editable.originalId ?? "";

    if (!name) {
        errors.push("Name is required.");
    }

    if (!id) {
        errors.push("Character ID is required. Enter a name that can be slugified, or set an ID in Advanced.");
    } else if (!isValidCharacterId(id)) {
        errors.push("Character ID may contain only lowercase letters, numbers, and single hyphens.");
    } else if (existingIds.has(id) && id !== originalId) {
        errors.push(`Character ID "${id}" already exists in the built-in character list.`);
    }

    if (editable.level !== "") {
        const level = Number(editable.level);
        if (!Number.isInteger(level) || level < 1 || level > 20) {
            errors.push("Level must be a whole number from 1 to 20.");
        }
    }

    const accent = editable.theme?.accent;
    if (!/^#[0-9a-fA-F]{6}$/.test(accent)) {
        errors.push("Theme color must be a valid hex color.");
    }

    return errors;
}

export function serializeEditableCharacter(editable, originalRaw = {}) {
    const exported = copyUnsupportedFields(originalRaw);
    const original = isPlainObject(originalRaw) ? originalRaw : {};
    const name = editable.name.trim();
    const id = editable.id.trim();

    exported.id = id;
    exported.name = name;

    setOptionalString(exported, "group", editable.group);

    exported.theme = mergeTheme(original.theme, editable.theme?.accent);

    if (editable.level !== "") {
        exported.level = Number(editable.level);
    }

    setLinkedScalar(exported, "class", editable.class, original.class);
    setLinkedScalar(exported, "subclass", editable.subclass, original.subclass);
    setLinkedScalar(exported, "species", editable.species, original.species);

    const feats = serializeEntryList(editable.feats);
    if (feats.length > 0) {
        exported.feats = feats;
    }

    const spells = serializeSpells(editable.spells);
    if (Object.keys(spells).length > 0) {
        exported.spells = spells;
    }

    const magicItems = serializeEntryList(editable.magic_items);
    if (magicItems.length > 0) {
        exported.magic_items = magicItems;
    }

    return exported;
}

export function serializeRawCharacter(raw) {
    const editable = createEditableCharacter(raw);
    return serializeEditableCharacter(editable, raw);
}

export function characterJsonString(character) {
    return `${JSON.stringify(character, null, 2)}\n`;
}

function copyUnsupportedFields(raw) {
    const exported = {};

    if (!isPlainObject(raw)) {
        return exported;
    }

    for (const [key, value] of Object.entries(raw)) {
        if (!SUPPORTED_FIELDS.has(key)) {
            exported[key] = deepClone(value);
        }
    }

    return exported;
}

function setOptionalString(target, field, value) {
    const trimmed = typeof value === "string" ? value.trim() : "";

    if (trimmed) {
        target[field] = trimmed;
    }
}

function setLinkedScalar(target, field, entry, originalValue) {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    const url = typeof entry?.url === "string" ? entry.url.trim() : "";

    if (!name) {
        return;
    }

    if (url) {
        const serialized = (
            isPlainObject(originalValue) &&
            typeof originalValue.name === "string" &&
            originalValue.name.trim() === name
        )
            ? deepClone(originalValue)
            : {};

        target[field] = {
            ...serialized,
            name,
            url
        };
        return;
    }

    target[field] = name;
}

function mergeTheme(originalTheme, accent) {
    const theme = isPlainObject(originalTheme) ? deepClone(originalTheme) : {};
    theme.accent = normalizeHexColor(accent);
    return theme;
}

function serializeEntryList(entries = []) {
    return entries
        .map(serializeEntry)
        .filter(entry => entry !== null);
}

function serializeEntry(entry) {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    const url = typeof entry?.url === "string" ? entry.url.trim() : "";

    if (!name) {
        return null;
    }

    if (url) {
        return { name, url };
    }

    return name;
}

function serializeSpells(spells = {}) {
    const serialized = {};
    const orderedKeys = [
        ...STANDARD_SPELL_LEVELS.map(level => level.key),
        ...Object.keys(spells).filter(
            key => !STANDARD_SPELL_LEVELS.some(level => level.key === key)
        )
    ];

    for (const level of orderedKeys) {
        const entries = serializeEntryList(spells[level]);

        if (entries.length > 0) {
            serialized[level] = entries;
        }
    }

    return serialized;
}
