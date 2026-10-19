import { proxyGet } from "./_proxy.js";

export default async function handler(request, response) {
    return proxyGet(request, response, {
        environmentVariable: "API_BLOQUES_URL",
        pathname: "/bloques",
        label: "bloques",
    });
}
