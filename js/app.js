import { loadCharacters, loadReferences } from "./data.js";
import { populateCharacterSelector, renderDashboard, showError } from "./ui.js";
import {
    characterJsonString,
    getRawCharacter,
    normalizeCharacter,
    serializeRawCharacter,
    validateRawCharacter
} from "./character-utils.js";

let activeCharacter = null;
let importCounter = 0;

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

function showAddCharacterMenu(button, menu) {
    const isOpen = menu.hidden === false;
    menu.hidden = isOpen;
    button.setAttribute("aria-expanded", String(!isOpen));
}

function hideAddCharacterMenu(button, menu) {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
}

async function init() {

    // Getting project metadata from package.json
    try {
        const response = await fetch("package.json");

        if (!response.ok) {
            throw new Error(`Failed to fetch package.json: ${response.status}`);
        }

        const pkg = await response.json();

        // Extract project metadata
        const projectName = pkg.projectName || pkg.name;
        const version = pkg.version;
        const author = pkg.author;
        const description = pkg.description;

        // Set page title
        document.title = projectName;

        // Set HTML metadata
        document.querySelector('meta[name="description"]')
            .setAttribute("content", description);

        document.querySelector('meta[name="author"]')
            .setAttribute("content", author);

        document.querySelector('meta[name="application-name"]')
            .setAttribute("content", projectName);

        // Set footer
        document.getElementById("footer-version").textContent =
            `${projectName} · v${version}`;

    } catch (error) {
        console.error("Could not fetch project metadata:", error);
    }

    // Getting character and reference data
    try {
        const [characters, references] = await Promise.all([
            loadCharacters(),
            loadReferences()
        ]);
        const dashboardCharacters = [...characters];

        if (!characters || characters.length === 0) {
            throw new Error("No character data found.");
        }

        // Initial character
        const defaultCharacter = characters[0];
        activeCharacter = defaultCharacter;

        // UI Controls
        populateCharacterSelector(dashboardCharacters, defaultCharacter.id);

        // -- Render the dashboard
        renderDashboard(defaultCharacter, references);

        // Event Listeners
        document.getElementById("character-select").addEventListener("change", (event) => {
            const selectedId = event.target.value;
            const selectedCharacter = dashboardCharacters.find(
                character => (character.selectorId || character.id) === selectedId
            );

            if (selectedCharacter) {
                activeCharacter = selectedCharacter;
                renderDashboard(selectedCharacter, references);
            }
        });

        const addButton = document.getElementById("add-character-button");
        const addMenu = document.getElementById("add-character-menu");
        const importInput = document.getElementById("character-import-input");

        addButton.addEventListener("click", (event) => {
            event.stopPropagation();
            showAddCharacterMenu(addButton, addMenu);
        });

        document.getElementById("create-character-action").addEventListener("click", () => {
            window.location.href = "editor.html";
        });

        document.getElementById("import-character-action").addEventListener("click", () => {
            importInput.click();
            hideAddCharacterMenu(addButton, addMenu);
        });

        document.getElementById("export-current-character").addEventListener("click", () => {
            if (!activeCharacter) {
                showError("No character is currently selected for export.");
                return;
            }

            const rawCharacter = getRawCharacter(activeCharacter);
            const serializedCharacter = serializeRawCharacter(rawCharacter);
            const filename = `${serializedCharacter.id || activeCharacter.id || "character"}.json`;

            downloadJson(filename, characterJsonString(serializedCharacter));
        });

        importInput.addEventListener("change", async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (!file) {
                return;
            }

            try {
                const text = await file.text();
                const rawCharacter = JSON.parse(text);
                const validationErrors = validateRawCharacter(rawCharacter);

                if (validationErrors.length > 0) {
                    showError(`Could not import ${file.name}: ${validationErrors.join(" ")}`);
                    return;
                }

                const importedCharacter = normalizeCharacter(rawCharacter);
                const selectorId = `imported-${++importCounter}-${importedCharacter.id || "character"}`;

                Object.defineProperty(importedCharacter, "selectorId", {
                    value: selectorId,
                    enumerable: false
                });

                importedCharacter.group = importedCharacter.group || "Imported";
                dashboardCharacters.push(importedCharacter);
                activeCharacter = importedCharacter;

                populateCharacterSelector(dashboardCharacters, selectorId);
                renderDashboard(importedCharacter, references);
            } catch (error) {
                console.error("Could not import character JSON:", error);
                showError(`Could not import ${file.name}. Please choose a valid character JSON file.`);
            }
        });

        document.addEventListener("click", (event) => {
            if (!addMenu.contains(event.target) && !addButton.contains(event.target)) {
                hideAddCharacterMenu(addButton, addMenu);
            }
        });
    } catch (error) {
        console.error("Could not initialize dashboard:", error);
        showError("Failed to load character data. Please ensure the character manifest and individual files are present and valid.");
    }
}

init();
