async function init() {

    // Getting config
    document.getElementById("footer-version").textContent =
        `${CONFIG.projectName} · v${CONFIG.version}`;

    // Getting character data
    const character = await loadCharacter();

    if (!character) {
        console.error("Could not initialize dashboard.");
        return;
    }

    // UI Controls
    // -- Render the dashboard
    renderDashboard(character);

}

init();