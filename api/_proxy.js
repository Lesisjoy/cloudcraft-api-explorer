const DEFAULT_TIMEOUT_MS = 8_000;

function getApiBaseUrl(environmentVariable, label) {
    const value = process.env[environmentVariable]?.trim();
    if (!value) throw new Error(`La API de ${label} todavía no está configurada.`);
    try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol)) throw new Error();
        return url.toString().replace(/\/$/, "");
    } catch { throw new Error(`La configuración de la API de ${label} no contiene una URL HTTP válida.`); }
}
function sendJson(response,status,body){ response.status(status).setHeader("Content-Type","application/json; charset=utf-8"); response.send(JSON.stringify(body)); }

export async function proxyGet(request,response,{environmentVariable,pathname,label}){
    if(request.method!=="GET")return methodNotAllowed(response,["GET"]);
    let baseUrl; try{baseUrl=getApiBaseUrl(environmentVariable,label);}catch(error){return sendJson(response,503,{error:error.message,code:"API_NOT_CONFIGURED"});}
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS); const headers={Accept:"application/json"};
    try{
        const upstream=await fetch(`${baseUrl}${pathname}`,{method:"GET",headers,signal:controller.signal});
        const rawBody=await upstream.text(); let body=null;
        if(rawBody){try{body=JSON.parse(rawBody);}catch{return sendJson(response,502,{error:`La API de ${label} devolvió una respuesta que no es JSON válido.`,upstream_status:upstream.status});}}
        return sendJson(response,upstream.status,body);
    }catch(error){ if(error.name==="AbortError")return sendJson(response,504,{error:`La API de ${label} tardó demasiado en responder.`}); return sendJson(response,502,{error:`No fue posible comunicarse con la API de ${label}.`}); }
    finally{clearTimeout(timeout);}
}
export function methodNotAllowed(response,allowedMethods){ response.setHeader("Allow",allowedMethods.join(", ")); return sendJson(response,405,{error:"Método no permitido."}); }
