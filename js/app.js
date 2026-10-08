async function init() {

    // Getting project metadata from package.json
    try {
        const response = await fetch("package.json");
        if (response.ok) {
            const pkg = await response.json();
            
            // Get project name and version from package.json
            const projectName = pkg.projectName || pkg.name;
            const version = pkg.version; 

            document.getElementById("footer-version").textContent =
                `${projectName} · v${version}`;
        }
    } catch (error) {
        console.error("Could not fetch project metadata:", error);
    }

    // Getting character data
    const characters = await loadCharacters();

    if (!characters || characters.length === 0) {
        console.error("Could not initialize dashboard.");
        return;
    }

    // Initial character
    const defaultCharacter = characters[0];

    // UI Controls
    populateCharacterSelector(characters, defaultCharacter.name);

    // -- Render the dashboard
    renderDashboard(defaultCharacter);

    // Event Listeners
    document.getElementById("character-select").addEventListener("change", (event) => {
        const selectedName = event.target.value;
        const selectedCharacter = characters.find(c => c.name === selectedName);

        if (selectedCharacter) {
            renderDashboard(selectedCharacter);
        }
    });
}

init();