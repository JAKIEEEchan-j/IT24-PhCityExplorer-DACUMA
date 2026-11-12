// ---------- Setup ----------
const map = L.map("map").setView([12.8797, 121.774], 6); // center of the Philippines

// Satellite imagery (Esri World Imagery)
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 18,
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics"
  }
).addTo(map);

// Place-name labels drawn on top of the satellite imagery
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18 }
).addTo(map);

// One layer group holds every marker, so clearing is a single call.
const markersLayer = L.layerGroup().addTo(map);

const form = document.getElementById("searchForm");
const input = document.getElementById("cityInput");
const button = document.getElementById("searchBtn");
const messageBox = document.getElementById("message");

// ---------- Helpers ----------
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = type; // info | error | success
}

function hideMessage() {
  messageBox.className = "";
  messageBox.textContent = "";
}

// Escape text before putting it in popup HTML (prevents HTML injection)
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Search ----------
async function searchCity(query) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    "?format=jsonv2" +
    "&limit=5" +                 // up to five matches
    "&countrycodes=ph" +         // Philippines only
    "&addressdetails=1" +
    "&q=" + encodeURIComponent(query);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error("Server responded with status " + response.status);
  }
  return response.json();
}

function displayResults(results) {
  const bounds = [];

  results.forEach((place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const name = place.name || place.display_name.split(",")[0];
    const country = (place.address && place.address.country) || "Philippines";

    const popupHtml =
      "<strong>" + escapeHtml(name) + "</strong><br>" + escapeHtml(country);

    L.marker([lat, lon]).bindPopup(popupHtml).addTo(markersLayer);
    bounds.push([lat, lon]);
  });

  // Zoom so every marker is visible
  if (bounds.length === 1) {
    map.setView(bounds[0], 12);
  } else {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = input.value.trim();

  // Clear old markers before every new search
  markersLayer.clearLayers();
  hideMessage();

  // Validate input
  if (!query) {
    showMessage("Please type a city name first.", "error");
    return;
  }

  button.disabled = true;
  showMessage("Searching for “" + query + "”…", "info");

  try {
    const results = await searchCity(query);

    if (results.length === 0) {
      showMessage(
        "No results found for “" + query + "”. Check the spelling or try another city.",
        "error"
      );
      return;
    }

    displayResults(results);
    showMessage(
      "Showing " + results.length + " match" + (results.length > 1 ? "es" : "") +
      " for “" + query + "”. Click a marker for details.",
      "success"
    );
  } catch (error) {
    console.error(error);
    showMessage(
      "Something went wrong while searching. Check your internet connection and try again.",
      "error"
    );
  } finally {
    button.disabled = false;
  }
});