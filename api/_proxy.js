const DEFAULT_TIMEOUT_MS = 10_000;

function getApiBaseUrl() {
    const value = process.env.API_BASE_URL?.trim();
    if (!value) throw new Error("API_BASE_URL no está configurada en el servidor.");
    try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol)) throw new Error();
        return url.toString().replace(/\/$/, "");
    } catch { throw new Error("API_BASE_URL no contiene una URL HTTP válida."); }
}
function sendJson(response,status,body){ response.status(status).setHeader("Content-Type","application/json; charset=utf-8"); response.send(JSON.stringify(body)); }

export async function proxyToFastApi(request,response,pathname){
    let baseUrl; try{baseUrl=getApiBaseUrl();}catch(error){return sendJson(response,500,{error:error.message});}
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS); const hasBody=!["GET","HEAD"].includes(request.method); const headers={Accept:"application/json"}; if(hasBody)headers["Content-Type"]="application/json";
    try{
        const upstream=await fetch(`${baseUrl}${pathname}`,{method:request.method,headers,body:hasBody?JSON.stringify(request.body??{}):undefined,signal:controller.signal});
        const rawBody=await upstream.text(); let body=null;
        if(rawBody){try{body=JSON.parse(rawBody);}catch{return sendJson(response,502,{error:"La API de contactos devolvió una respuesta JSON inválida.",upstream_status:upstream.status});}}
        return sendJson(response,upstream.status,body);
    }catch(error){ if(error.name==="AbortError")return sendJson(response,504,{error:"La API de contactos tardó demasiado en responder."}); return sendJson(response,502,{error:"La API de contactos no está disponible en este momento."}); }
    finally{clearTimeout(timeout);}
}
export function methodNotAllowed(response,allowedMethods){ response.setHeader("Allow",allowedMethods.join(", ")); return sendJson(response,405,{error:"Método no permitido."}); }
