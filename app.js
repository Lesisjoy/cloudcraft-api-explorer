const RESOURCE_CONFIG = {
    criaturas: {
        endpoint: "/api/criaturas",
        singular: "criatura",
        plural: "criaturas",
    },
    bloques: {
        endpoint: "/api/bloques",
        singular: "bloque",
        plural: "bloques",
    },
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeRecords(payload, resource) {
    if (Array.isArray(payload)) return payload;
    for (const key of [resource, "data", "resultados", "items"]) {
        if (Array.isArray(payload?.[key])) return payload[key];
    }
    throw new Error("La API respondió, pero los datos no tienen el formato esperado.");
}

async function requestJson(url) {
    let response;
    try {
        response = await fetch(url, { headers: { Accept: "application/json" } });
    } catch {
        throw new Error("No fue posible conectar con el servidor de Vercel.");
    }

    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            throw new Error("El servidor devolvió una respuesta que no es JSON válido.");
        }
    }
    if (!response.ok) {
        throw new Error(payload?.error || payload?.detail || `La solicitud falló con código ${response.status}.`);
    }
    return payload;
}

function renderCards(records, resource) {
    if (!records.length) return `<div class="empty">No existen registros de ${resource}.</div>`;
    return records.map((item) => `
        <article class="item-card ${resource === "bloques" ? "block" : ""}">
            <div class="item-top">
                <h3>${escapeHtml(item.nombre || "Sin nombre")}</h3>
                <span class="id">#${escapeHtml(item.id ?? item.elemento_id ?? "—")}</span>
            </div>
            <div class="tags">
                <span class="tag">${escapeHtml(item.tipo || resource.slice(0, -1))}</span>
                <span class="tag">${escapeHtml(item.categoria || "Sin categoría")}</span>
                <span class="tag rare">Rareza: ${escapeHtml(item.rareza || "No indicada")}</span>
            </div>
            <p>${escapeHtml(item.descripcion || "Sin descripción disponible.")}</p>
        </article>`).join("");
}

async function loadResource(panel) {
    const resource = panel.dataset.resource;
    const config = RESOURCE_CONFIG[resource];
    const button = panel.querySelector("[data-action='load']");
    const status = panel.querySelector("[data-status]");
    const results = panel.querySelector("[data-results]");

    button.disabled = true;
    button.textContent = "Consultando…";
    status.className = "status";
    status.textContent = `Consultando ${config.plural}…`;
    results.innerHTML = "";

    try {
        const records = normalizeRecords(await requestJson(config.endpoint), resource);
        results.innerHTML = renderCards(records, resource);
        status.className = "status success";
        status.textContent = records.length
            ? `${records.length} ${records.length === 1 ? config.singular : config.plural} encontrados.`
            : `No existen registros de ${config.plural}.`;
    } catch (error) {
        status.className = "status error";
        status.textContent = error.message;
        results.innerHTML = "";
    } finally {
        button.disabled = false;
        button.textContent = `Volver a consultar ${config.plural}`;
    }
}

document.querySelectorAll("[data-resource]").forEach((panel) => {
    panel.querySelector("[data-action='load']").addEventListener("click", () => loadResource(panel));
});
