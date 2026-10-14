const API_PATH = "/api/contactos";
const TEXT_FIELDS = ["nombre", "apellido", "telefono", "correo", "direccion"];
const contactsElement = document.querySelector("#contacts");
const countElement = document.querySelector("#count");
const statusElement = document.querySelector("#status");
const form = document.querySelector("#contactForm");
const formTitle = document.querySelector("#formTitle");
const saveButton = document.querySelector("#saveButton");
const cancelButton = document.querySelector("#cancelButton");
const reloadButton = document.querySelector("#reloadButton");
const detailDialog = document.querySelector("#detailDialog");
const detailContent = document.querySelector("#detailContent");
const categoryHint = document.querySelector("#categoryHint");
let contacts = [];

function escapeHtml(value) { return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function showStatus(message,type="") { statusElement.textContent=message; statusElement.className=`status visible ${type}`.trim(); }
function clearStatus() { statusElement.textContent=""; statusElement.className="status"; }

async function request(path, options={}) {
    let response;
    try { response=await fetch(path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}}); }
    catch { throw new Error("No fue posible comunicarse con el servidor. Revisa tu conexión e intenta de nuevo."); }
    const text=await response.text(); let data=null;
    if(text){ try{ data=JSON.parse(text); } catch{ throw new Error("El servidor devolvió una respuesta que no se pudo interpretar."); } }
    if(!response.ok){
        const detail=data?.detail||data?.error||data?.message;
        const message=Array.isArray(detail)
            ? detail.map(item=>`${item.loc?.at(-1)||"campo"}: ${item.msg||"valor no válido"}`).join(" · ")
            : typeof detail==="object" && detail!==null
                ? JSON.stringify(detail)
                : detail;
        throw new Error(message||`La solicitud falló con el código ${response.status}.`);
    }
    return data;
}
function normalizeList(data){ if(Array.isArray(data))return data; if(Array.isArray(data?.contactos))return data.contactos; if(Array.isArray(data?.data))return data.data; throw new Error("La API respondió, pero el listado no tiene el formato esperado."); }

function renderContacts(){
    countElement.textContent=`${contacts.length} ${contacts.length===1?"registro":"registros"}`; contactsElement.setAttribute("aria-busy","false");
    if(!contacts.length){ contactsElement.innerHTML='<div class="empty">Todavía no hay contactos registrados.</div>'; return; }
    contactsElement.innerHTML=contacts.map(contact=>{ const id=encodeURIComponent(contact.contacto_id); const initials=`${contact.nombre?.[0]||""}${contact.apellido?.[0]||""}`.toUpperCase()||"?"; return `
      <article class="contact"><div class="avatar" aria-hidden="true">${escapeHtml(initials)}</div><div><strong>${escapeHtml(contact.nombre)} ${escapeHtml(contact.apellido)}</strong><small>${escapeHtml(contact.correo||"Sin correo")}</small></div><div class="contact-meta"><span>${escapeHtml(contact.telefono||"Sin teléfono")}</span><small>${escapeHtml(contact.categoria||"Sin categoría")}</small></div><div class="contact-actions"><button class="icon-button" data-action="view" data-id="${id}" title="Consultar" aria-label="Consultar contacto">⌕</button><button class="icon-button" data-action="edit" data-id="${id}" title="Editar" aria-label="Editar contacto">✎</button><button class="icon-button" data-action="delete" data-id="${id}" title="Eliminar" aria-label="Eliminar contacto">×</button></div></article>`; }).join("");
}

async function loadContacts({quiet=false}={}){
    if(!quiet){ contactsElement.setAttribute("aria-busy","true"); contactsElement.innerHTML='<div class="empty">Cargando contactos…</div>'; showStatus("Consultando la API…"); }
    reloadButton.disabled=true;
    try{ contacts=normalizeList(await request(API_PATH)); renderContacts(); clearStatus(); }
    catch(error){ contacts=[]; renderContacts(); showStatus(error.message,"error"); }
    finally{ reloadButton.disabled=false; }
}
function resetForm(){ form.reset(); form.contacto_id.value=""; formTitle.textContent="Nuevo contacto"; saveButton.textContent="Crear contacto"; cancelButton.hidden=true; categoryHint.textContent="FastAPI requiere el identificador numérico de la categoría."; }
function editContact(contact){
    form.contacto_id.value=contact.contacto_id;
    for(const field of TEXT_FIELDS)form.elements[field].value=contact[field]??"";
    form.categoria_id.value=contact.categoria_id??"";
    categoryHint.textContent=contact.categoria_id
        ? `Categoría actual: ${contact.categoria||contact.categoria_id}.`
        : `Categoría actual: ${contact.categoria||"sin nombre"}. La API no devuelve su ID; introdúcelo para guardar.`;
    formTitle.textContent="Editar contacto"; saveButton.textContent="Guardar cambios"; cancelButton.hidden=false; form.scrollIntoView({behavior:"smooth",block:"start"});
}
function showContact(contact){ const labels={contacto_id:"ID",nombre:"Nombre",apellido:"Apellido",telefono:"Teléfono",correo:"Correo",direccion:"Dirección",categoria:"Categoría",categoria_id:"ID de categoría"}; detailContent.innerHTML=Object.entries(labels).filter(([field])=>contact[field]!==undefined).map(([field,label])=>`<div class="detail-item ${field==="direccion"?"wide":""}"><small>${label}</small><strong>${escapeHtml(contact[field]||"—")}</strong></div>`).join(""); detailDialog.showModal(); }

contactsElement.addEventListener("click",async event=>{
    const button=event.target.closest("[data-action]"); if(!button)return; const id=decodeURIComponent(button.dataset.id); button.disabled=true;
    try{
        if(button.dataset.action==="delete"){ const contact=contacts.find(item=>String(item.contacto_id)===String(id)); if(!window.confirm(`¿Eliminar a ${contact?.nombre||"este contacto"}?`))return; await request(`${API_PATH}/${encodeURIComponent(id)}`,{method:"DELETE"}); await loadContacts({quiet:true}); showStatus("Contacto eliminado correctamente.","success"); return; }
        const contact=await request(`${API_PATH}/${encodeURIComponent(id)}`); if(button.dataset.action==="view")showContact(contact); if(button.dataset.action==="edit")editContact(contact);
    }catch(error){ showStatus(error.message,"error"); }finally{ button.disabled=false; }
});
form.addEventListener("submit",async event=>{
    event.preventDefault();
    const id=form.contacto_id.value;
    const payload=Object.fromEntries(TEXT_FIELDS.map(field=>[field,form.elements[field].value.trim()]));
    payload.categoria_id=Number.parseInt(form.categoria_id.value,10);
    if(!Number.isInteger(payload.categoria_id)||payload.categoria_id<1){ showStatus("El ID de categoría debe ser un número entero mayor que cero.","error"); return; }
    saveButton.disabled=true; showStatus(id?"Guardando cambios…":"Creando contacto…");
    try{ await request(id?`${API_PATH}/${encodeURIComponent(id)}`:API_PATH,{method:id?"PUT":"POST",body:JSON.stringify(payload)}); resetForm(); await loadContacts({quiet:true}); showStatus(id?"Contacto actualizado correctamente.":"Contacto creado correctamente.","success"); }
    catch(error){ showStatus(error.message,"error"); }finally{ saveButton.disabled=false; }
});
reloadButton.addEventListener("click",()=>loadContacts()); cancelButton.addEventListener("click",resetForm); document.querySelector("#closeDialog").addEventListener("click",()=>detailDialog.close()); detailDialog.addEventListener("click",event=>{if(event.target===detailDialog)detailDialog.close();}); loadContacts();
