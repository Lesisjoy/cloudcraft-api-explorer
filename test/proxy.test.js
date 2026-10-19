import assert from "node:assert/strict";
import test from "node:test";
import { proxyGet } from "../api/_proxy.js";

function createResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        setHeader(name, value) { this.headers[name] = value; return this; },
        send(body) { this.body = JSON.parse(body); return this; },
    };
}

const request = { method: "GET" };
const options = { environmentVariable: "TEST_API_URL", pathname: "/items", label: "prueba" };

test("responde 503 si la variable no está configurada", async () => {
    delete process.env.TEST_API_URL;
    const response = createResponse();
    await proxyGet(request, response, options);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, "API_NOT_CONFIGURED");
});

test("conserva el status y cuerpo JSON de la API", async (context) => {
    process.env.TEST_API_URL = "http://example.test";
    context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "No encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
    }));
    const response = createResponse();
    await proxyGet(request, response, options);
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, { detail: "No encontrado" });
});

test("responde 502 si la API no devuelve JSON", async (context) => {
    process.env.TEST_API_URL = "http://example.test";
    context.mock.method(globalThis, "fetch", async () => new Response("respuesta de texto", { status: 200 }));
    const response = createResponse();
    await proxyGet(request, response, options);
    assert.equal(response.statusCode, 502);
    assert.match(response.body.error, /no es JSON válido/);
});

test("rechaza métodos distintos de GET", async () => {
    const response = createResponse();
    await proxyGet({ method: "POST" }, response, options);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "GET");
});
