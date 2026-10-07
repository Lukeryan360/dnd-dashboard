async function init() {

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