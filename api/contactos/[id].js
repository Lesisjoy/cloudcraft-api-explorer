import { methodNotAllowed, proxyToFastApi } from "../_proxy.js";
const ALLOWED_METHODS = ["GET", "PUT", "DELETE"];
export default async function handler(request,response){
    if(!ALLOWED_METHODS.includes(request.method))return methodNotAllowed(response,ALLOWED_METHODS);
    const id=Array.isArray(request.query.id)?request.query.id[0]:request.query.id;
    if(!id||!/^\d+$/.test(String(id)))return response.status(400).json({error:"El identificador del contacto no es válido."});
    return proxyToFastApi(request,response,`/contactos/${encodeURIComponent(id)}`);
}
