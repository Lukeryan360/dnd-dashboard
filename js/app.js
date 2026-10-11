import { loadCharacters, loadReferences } from "./data.js";
import { populateCharacterSelector, renderDashboard, showError } from "./ui.js";

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

        if (!characters || characters.length === 0) {
            throw new Error("No character data found.");
        }

        // Initial character
        const defaultCharacter = characters[0];

        // UI Controls
        populateCharacterSelector(characters, defaultCharacter.id);

        // -- Render the dashboard
        renderDashboard(defaultCharacter, references);

        // Event Listeners
        document.getElementById("character-select").addEventListener("change", (event) => {
            const selectedId = event.target.value;
            const selectedCharacter = characters.find(c => c.id === selectedId);

            if (selectedCharacter) {
                renderDashboard(selectedCharacter, references);
            }
        });
    } catch (error) {
        console.error("Could not initialize dashboard:", error);
        showError("Failed to load character data. Please ensure the character manifest and individual files are present and valid.");
    }
}

init();