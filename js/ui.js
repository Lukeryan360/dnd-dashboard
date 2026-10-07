// ============================================================
// ui.js
// Handles rendering and user interface behavior.
// ============================================================

// ------------------------------------------------------------
// Reference Page Links
// ------------------------------------------------------------

const REFERENCE_PAGES = [
    {
        name: "Adventuring Gear",
        url: "https://dnd2024.wikidot.com/equipment:adventuring-gear"
    },
    {
        name: "Weapons",
        url: "https://dnd2024.wikidot.com/equipment:weapon"
    },
    {
        name: "Armor",
        url: "https://dnd2024.wikidot.com/equipment:armor"
    },
    {
        name: "Tools",
        url: "https://dnd2024.wikidot.com/equipment:tool"
    }
];


// ============================================================
// Render Dashboard
// ============================================================

// ------------------------------------------------------------
// Create Link
// ------------------------------------------------------------

function createLink(item) {
    const link = document.createElement("a");

    link.textContent = item.name;
    link.href = item.url;

    // All links reuse the same reference tab
    link.target = "dnd-reference";

    //link.rel = "noopener noreferrer";

    link.classList.add("dashboard-link");

    return link;
}

// ------------------------------------------------------------
// Render Lists of Items (e.g. prepared spells)
// ------------------------------------------------------------

function renderList(items, container) {

    container.innerHTML = "";

    for (const item of items) {
        const link = createLink(item);
        container.appendChild(link);
    }
}

// ------------------------------------------------------------
// Character Section (main)
// ------------------------------------------------------------
function renderCharacter(character) {

    // Header
    document.getElementById("character-name").textContent =
        character.name;

    document.getElementById("character-summary").textContent =
        `Level ${character.level} ${character.class.name}`;


    // Character links
    const container =
        document.getElementById("character-links");

    container.innerHTML = "";

    const mainInfo = [
        character.class,
        character.subclass,
        character.species
    ];

    for (const item of mainInfo) {
        if (item) {
            container.appendChild(createLink(item));
        }
    }


    // Feats
    for (const feat of character.feats) {
        container.appendChild(createLink(feat));
    }
}

function renderSpells(character) {

    const container =
        document.getElementById("spell-links");

    container.innerHTML = "";

    for (const [level, spells] of Object.entries(character.spells)) {

        // Don't show empty spell levels
        if (spells.length === 0) {
            continue;
        }

        const group = document.createElement("div");
        group.classList.add("spell-group");


        // Spell level heading
        const heading = document.createElement("h3");

        if (level === "cantrips") {
            heading.textContent = "Cantrips";
        } else {
            const number = level.replace("level_", "");
            heading.textContent = `Level ${number}`;
        }

        group.appendChild(heading);


        // Spell links
        for (const spell of spells) {
            group.appendChild(createLink(spell));
        }

        container.appendChild(group);
    }
}

function renderMagicItems(character) {

    const container =
        document.getElementById("magic-item-links");

    renderList(
        character.magic_items,
        container
    );
}

// Extra Reference Links
function renderReferences() {
    const container =
        document.getElementById("reference-links");

    renderList(
        REFERENCE_PAGES,
        container
    );
}

function renderDashboard(character) {
    renderCharacter(character);
    renderSpells(character);
    renderMagicItems(character);
    renderReferences();
}

