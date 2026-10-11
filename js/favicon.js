/**
 * Favicon management utility.
 * Handles loading, recoloring, and updating the site's favicon.
 */

let sourceSvg = null;
const DEFAULT_COLOR = "#000000";

/**
 * Fetches the source SVG once and stores it.
 * @returns {Promise<string>} The SVG markup.
 */
async function getSourceSvg() {
    if (sourceSvg) return sourceSvg;

    try {
        const response = await fetch("assets/favicon.svg");
        if (!response.ok) throw new Error("Failed to load favicon asset.");
        sourceSvg = await response.text();
        return sourceSvg;
    } catch (error) {
        console.error("Favicon error:", error);
        return null;
    }
}

/**
 * Updates the favicon color.
 * @param {string} color - The hex color to apply.
 */
export async function updateFavicon(color = DEFAULT_COLOR) {
    const svgMarkup = await getSourceSvg();
    if (!svgMarkup) return;

    // Recolor the SVG. The source has fill="#000000"
    // We replace it with the new color.
    // Also ensuring we only replace the path fill.
    const recoloredSvg = svgMarkup.replace(/fill="#000000"/g, `fill="${color}"`);

    // Create a data URL from the SVG markup
    const encodedSvg = encodeURIComponent(recoloredSvg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    // Update the favicon link element
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/svg+xml";
        document.head.appendChild(link);
    } else {
        link.type = "image/svg+xml";
    }

    link.href = dataUrl;
}
