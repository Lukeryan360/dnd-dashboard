async function init() {

    // Getting config
    document.getElementById("footer-version").textContent =
        `${CONFIG.projectName} · v${CONFIG.version}`;

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