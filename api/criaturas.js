import { proxyGet } from "./_proxy.js";

export default async function handler(request, response) {
    return proxyGet(request, response, {
        environmentVariable: "API_CRIATURAS_URL",
        pathname: "/criaturas",
        label: "criaturas",
    });
}
