import { loadCharacters } from "./data.js";
import { showError } from "./ui.js";
import {
    STANDARD_SPELL_LEVELS,
    characterJsonString,
    createEditableCharacter,
    createEmptyEditableCharacter,
    getSpellLevelLabel,
    serializeEditableCharacter,
    slugifyCharacterId,
    validateEditableCharacter,
    validateRawCharacter
} from "./character-utils.js";
import { updateFavicon } from "./favicon.js";

let editableCharacter = createEmptyEditableCharacter();
let originalRawCharacter = {};
let originalId = "";
let existingIds = new Set();
let isImportedCharacter = false;
let lastSavedSnapshot = "";
let currentExportText = "";

const form = document.getElementById("character-editor");
const validationMessage = document.getElementById("editor-validation");
const preview = document.getElementById("json-preview");
const exportButton = document.getElementById("export-character");
const idInput = document.getElementById("field-id");
const nameInput = document.getElementById("field-name");

const FIELD_IDS = {
    name: "field-name",
    group: "field-group",
    level: "field-level",
    class: "field-class",
    classUrl: "field-class-url",
    subclass: "field-subclass",
    subclassUrl: "field-subclass-url",
    species: "field-species",
    speciesUrl: "field-species-url",
    theme: "field-theme",
    id: "field-id"
};

async function init() {
    await setProjectMetadata();
    await loadExistingCharacterIds();

    const importedRawCharacter = getImportedCharacter();

    if (importedRawCharacter) {
        const errors = validateRawCharacter(importedRawCharacter);

        if (errors.length > 0) {
            showError(`Imported character could not be edited: ${errors.join(" ")}`);
        } else {
            originalRawCharacter = importedRawCharacter;
            editableCharacter = createEditableCharacter(importedRawCharacter);
            originalId = editableCharacter.id;
            isImportedCharacter = true;
        }
    }

    renderEditor();
    attachEvents();
    updatePreview();
    lastSavedSnapshot = currentExportText;
}

async function setProjectMetadata() {
    try {
        const response = await fetch("package.json");

        if (!response.ok) {
            throw new Error(`Failed to fetch package.json: ${response.status}`);
        }

        const pkg = await response.json();
        const projectName = pkg.projectName || pkg.name;

        document.title = `${projectName} Character Editor`;
        document.querySelector('meta[name="description"]').setAttribute("content", pkg.description);
        document.querySelector('meta[name="author"]').setAttribute("content", pkg.author);
        document.querySelector('meta[name="application-name"]').setAttribute("content", projectName);
        document.getElementById("footer-version").textContent = `${projectName} · v${pkg.version}`;
    } catch (error) {
        console.error("Could not fetch project metadata:", error);
    }
}

async function loadExistingCharacterIds() {
    try {
        const characters = await loadCharacters();
        existingIds = new Set(characters.map(character => character.id).filter(Boolean));
    } catch (error) {
        console.warn("Could not load existing character IDs:", error);
        existingIds = new Set();
    }
}

function getImportedCharacter() {
    if (!window.location.hash.startsWith("#import=")) {
        return null;
    }

    try {
        const encodedJson = window.location.hash.slice("#import=".length);
        const json = decodeURIComponent(encodedJson);
        const rawCharacter = JSON.parse(json);

        window.history.replaceState(null, "", "editor.html");

        return rawCharacter;
    } catch (error) {
        console.error("Could not parse imported character:", error);
        showError("The imported character could not be opened. Please choose a valid character JSON file.");
        return null;
    }
}

function attachEvents() {
    form.addEventListener("input", handleFormInput);
    form.addEventListener("click", handleFormClick);

    exportButton.addEventListener("click", () => {
        updateEditableFromForm();
        updatePreview();

        const errors = getValidationErrors();

        if (errors.length > 0) {
            validationMessage.textContent = errors.join(" ");
            validationMessage.classList.add("is-error");
            return;
        }

        const filename = `${editableCharacter.id.trim()}.json`;
        downloadJson(filename, currentExportText);
        lastSavedSnapshot = currentExportText;
        updateUnsavedState();
    });

    window.addEventListener("beforeunload", (event) => {
        if (!hasUnsavedChanges()) {
            return;
        }

        event.preventDefault();
        event.returnValue = "";
    });

    document.getElementById("back-to-dashboard").addEventListener("click", (event) => {
        if (!hasUnsavedChanges()) {
            return;
        }

        const leavePage = window.confirm("You have unsaved changes. Leave the editor without exporting?");

        if (!leavePage) {
            event.preventDefault();
        }
    });
}

function handleFormInput(event) {
    if (event.target === nameInput && !isImportedCharacter && !idInput.dataset.manuallyEdited) {
        idInput.value = slugifyCharacterId(nameInput.value);
    }

    if (event.target === idInput) {
        idInput.dataset.manuallyEdited = "true";
    }

    updateEditableFromForm();
    updatePreview();
}

function handleFormClick(event) {
    const addListName = event.target.dataset.addListItem;
    const addSpellLevel = event.target.dataset.addSpell;
    const removeButton = event.target.closest("[data-remove-entry]");

    if (addListName) {
        updateEditableFromForm();
        editableCharacter[addListName].push({ name: "", url: "" });
        renderDynamicLists();
        updatePreview();
        return;
    }

    if (addSpellLevel) {
        updateEditableFromForm();
        editableCharacter.spells[addSpellLevel].push({ name: "", url: "" });
        renderDynamicLists();
        updatePreview();
        return;
    }

    if (removeButton) {
        const list = removeButton.dataset.list;
        const index = Number(removeButton.dataset.index);
        const level = removeButton.dataset.level;

        updateEditableFromForm();

        if (level) {
            editableCharacter.spells[level].splice(index, 1);
        } else {
            editableCharacter[list].splice(index, 1);
        }

        renderDynamicLists();
        updatePreview();
    }
}

function renderEditor() {
    document.getElementById(FIELD_IDS.name).value = editableCharacter.name;
    document.getElementById(FIELD_IDS.group).value = editableCharacter.group;
    document.getElementById(FIELD_IDS.level).value = editableCharacter.level;
    document.getElementById(FIELD_IDS.class).value = editableCharacter.class.name;
    document.getElementById(FIELD_IDS.classUrl).value = editableCharacter.class.url;
    document.getElementById(FIELD_IDS.subclass).value = editableCharacter.subclass.name;
    document.getElementById(FIELD_IDS.subclassUrl).value = editableCharacter.subclass.url;
    document.getElementById(FIELD_IDS.species).value = editableCharacter.species.name;
    document.getElementById(FIELD_IDS.speciesUrl).value = editableCharacter.species.url;
    document.getElementById(FIELD_IDS.theme).value = editableCharacter.theme.accent;
    document.getElementById(FIELD_IDS.id).value = editableCharacter.id;

    if (isImportedCharacter) {
        idInput.dataset.manuallyEdited = "true";
    }

    renderDynamicLists();
}

function renderDynamicLists() {
    renderEntryList("feats", document.getElementById("feats-list"), "Feat");
    renderEntryList("magic_items", document.getElementById("magic-items-list"), "Magic Item");
    renderSpellLevels();
}

function renderEntryList(listName, container, label) {
    const entries = editableCharacter[listName];

    container.innerHTML = "";

    if (entries.length === 0) {
        container.appendChild(emptyListMessage());
        return;
    }

    entries.forEach((entry, index) => {
        container.appendChild(createEntryRow({
            entry,
            label,
            list: listName,
            index
        }));
    });
}

function renderSpellLevels() {
    const container = document.getElementById("spell-levels");
    const spellLevels = [
        ...STANDARD_SPELL_LEVELS.map(level => level.key),
        ...Object.keys(editableCharacter.spells).filter(
            key => !STANDARD_SPELL_LEVELS.some(level => level.key === key)
        )
    ];

    container.innerHTML = "";

    for (const level of spellLevels) {
        if (!editableCharacter.spells[level]) {
            editableCharacter.spells[level] = [];
        }

        const section = document.createElement("section");
        section.className = "spell-level-editor";

        const heading = document.createElement("div");
        heading.className = "section-heading-row";

        const title = document.createElement("h3");
        title.textContent = getSpellLevelLabel(level);

        const addButton = document.createElement("button");
        addButton.className = "secondary-button";
        addButton.type = "button";
        addButton.dataset.addSpell = level;
        addButton.textContent = "Add";

        heading.append(title, addButton);
        section.appendChild(heading);

        const list = document.createElement("div");
        list.className = "dynamic-list";

        if (editableCharacter.spells[level].length === 0) {
            list.appendChild(emptyListMessage());
        } else {
            editableCharacter.spells[level].forEach((entry, index) => {
                list.appendChild(createEntryRow({
                    entry,
                    label: "Spell",
                    list: "spells",
                    level,
                    index
                }));
            });
        }

        section.appendChild(list);
        container.appendChild(section);
    }
}

function createEntryRow({ entry, label, list, level = "", index }) {
    const row = document.createElement("div");
    row.className = "entry-row";

    const nameLabel = document.createElement("label");
    nameLabel.className = "field";

    const nameText = document.createElement("span");
    nameText.textContent = `${label} Name`;

    const nameInputElement = document.createElement("input");
    nameInputElement.type = "text";
    nameInputElement.value = entry.name;
    nameInputElement.autocomplete = "off";
    nameInputElement.dataset.entryField = "name";
    nameInputElement.dataset.list = list;
    nameInputElement.dataset.index = String(index);

    if (level) {
        nameInputElement.dataset.level = level;
    }

    nameLabel.append(nameText, nameInputElement);

    const urlLabel = document.createElement("label");
    urlLabel.className = "field";

    const urlText = document.createElement("span");
    urlText.textContent = "Custom URL";

    const urlInputElement = document.createElement("input");
    urlInputElement.type = "url";
    urlInputElement.value = entry.url;
    urlInputElement.autocomplete = "off";
    urlInputElement.placeholder = "Optional";
    urlInputElement.dataset.entryField = "url";
    urlInputElement.dataset.list = list;
    urlInputElement.dataset.index = String(index);

    if (level) {
        urlInputElement.dataset.level = level;
    }

    urlLabel.append(urlText, urlInputElement);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.dataset.removeEntry = "true";
    removeButton.dataset.list = list;
    removeButton.dataset.index = String(index);
    removeButton.textContent = "Remove";

    if (level) {
        removeButton.dataset.level = level;
    }

    row.append(nameLabel, urlLabel, removeButton);
    return row;
}

function emptyListMessage() {
    const message = document.createElement("p");
    message.className = "muted empty-list-message";
    message.textContent = "No entries.";
    return message;
}

function updateEditableFromForm() {
    editableCharacter.name = document.getElementById(FIELD_IDS.name).value;
    editableCharacter.group = document.getElementById(FIELD_IDS.group).value;
    editableCharacter.level = document.getElementById(FIELD_IDS.level).value;
    editableCharacter.class.name = document.getElementById(FIELD_IDS.class).value;
    editableCharacter.class.url = document.getElementById(FIELD_IDS.classUrl).value;
    editableCharacter.subclass.name = document.getElementById(FIELD_IDS.subclass).value;
    editableCharacter.subclass.url = document.getElementById(FIELD_IDS.subclassUrl).value;
    editableCharacter.species.name = document.getElementById(FIELD_IDS.species).value;
    editableCharacter.species.url = document.getElementById(FIELD_IDS.speciesUrl).value;
    editableCharacter.theme.accent = document.getElementById(FIELD_IDS.theme).value;
    editableCharacter.id = document.getElementById(FIELD_IDS.id).value;

    for (const input of form.querySelectorAll("[data-entry-field]")) {
        const list = input.dataset.list;
        const index = Number(input.dataset.index);
        const field = input.dataset.entryField;
        const level = input.dataset.level;

        const targetList = level
            ? editableCharacter.spells[level]
            : editableCharacter[list];

        if (!targetList?.[index]) {
            continue;
        }

        targetList[index][field] = input.value;
    }
}

function getValidationErrors() {
    return validateEditableCharacter(editableCharacter, {
        existingIds,
        originalId
    });
}

function updatePreview() {
    const errors = getValidationErrors();

    if (errors.length > 0) {
        validationMessage.textContent = errors.join(" ");
        validationMessage.classList.add("is-error");
        preview.textContent = "";
        currentExportText = "";
    } else {
        const serialized = serializeEditableCharacter(editableCharacter, originalRawCharacter);
        currentExportText = characterJsonString(serialized);
        validationMessage.textContent = "Ready to export.";
        validationMessage.classList.remove("is-error");
        preview.textContent = currentExportText;
    }

    document.getElementById("character-name").textContent =
        editableCharacter.name.trim() || "Character Editor";

    const classSummary = [
        editableCharacter.level ? `Level ${editableCharacter.level}` : "",
        editableCharacter.class.name.trim(),
        editableCharacter.subclass.name.trim() ? `(${editableCharacter.subclass.name.trim()})` : ""
    ].filter(Boolean).join(" ");

    document.getElementById("character-summary").textContent =
        classSummary || "Create or import, preview, and export dashboard-ready JSON.";

    document.documentElement.style.setProperty("--accent", editableCharacter.theme.accent);
    updateFavicon(editableCharacter.theme.accent);
    updateUnsavedState();
}

function hasUnsavedChanges() {
    return currentExportText !== lastSavedSnapshot;
}

function updateUnsavedState() {
    exportButton.disabled = currentExportText === "";

    if (exportButton.disabled) {
        exportButton.textContent = "Export JSON";
        return;
    }

    exportButton.textContent = hasUnsavedChanges()
        ? "Export JSON"
        : "Exported";
}

function downloadJson(filename, jsonText) {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

init();
