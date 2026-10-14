import { methodNotAllowed, proxyToFastApi } from "./_proxy.js";
const ALLOWED_METHODS = ["GET", "POST"];
export default async function handler(request,response){ if(!ALLOWED_METHODS.includes(request.method))return methodNotAllowed(response,ALLOWED_METHODS); return proxyToFastApi(request,response,"/contactos"); }
