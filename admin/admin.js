const cfg = window.ELECTRONIX_CONFIG;
const configured =
  cfg?.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("PON_AQUI") &&
  cfg?.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith("PON_AQUI");

if(!configured){
  document.getElementById("loginMsg").textContent="Primero completa config.js con los datos de Supabase.";
  document.getElementById("loginMsg").classList.add("error");
}

const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY) : null;
let products=[];
let selected=null;
let draftTiers=[];
let draftImages=[];

const $=id=>document.getElementById(id);

async function init(){
  if(!db)return;
  const {data:{session}}=await db.auth.getSession();
  if(session) showAdmin();
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db)return;
  $("loginMsg").textContent="Ingresando...";
  const {error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  if(error){$("loginMsg").textContent=error.message;$("loginMsg").className="msg error";return}
  $("loginMsg").textContent="";
  showAdmin();
});
async function logout(){if(db)await db.auth.signOut();location.reload()}
async function showAdmin(){
  $("loginView").classList.add("hidden");$("adminView").classList.remove("hidden");await loadProducts();
}
async function loadProducts(){
  const {data,error}=await db.from("products").select("*").order("display_order",{ascending:true});
  if(error){alert(error.message);return}
  products=data||[];renderList();
  if(selected){
    const fresh=products.find(p=>p.id===selected.id);
    if(fresh) selectProduct(fresh.id);
  }
}
function renderList(){
  $("productList").innerHTML=products.map(p=>`
    <div class="product-item ${selected?.id===p.id?"active":""}" onclick="selectProduct('${p.id}')">
      <strong>${p.name}</strong>
      <div class="product-meta"><span>${p.stock} unidades</span><span>${p.active?"Visible":"Oculto"}</span></div>
    </div>`).join("");
}
function selectProduct(id){
  selected=products.find(p=>p.id===id); if(!selected)return;
  draftTiers=Array.isArray(selected.tiers)?JSON.parse(JSON.stringify(selected.tiers)):[];
  draftImages=Array.isArray(selected.images)?[...selected.images]:[];
  $("emptyEditor").classList.add("hidden");$("editorForm").classList.remove("hidden");
  $("editorTitle").textContent=selected.name;$("name").value=selected.name;$("stock").value=selected.stock;
  $("displayOrder").value=selected.display_order||0;$("active").checked=!!selected.active;
  renderTiers();renderImages();renderList();
}
function renderTiers(){
  $("tiersEditor").innerHTML=draftTiers.map((t,i)=>`
    <div class="tier-row">
      <div><label>Desde cantidad</label><input type="number" min="1" value="${t.min}" oninput="draftTiers[${i}].min=Number(this.value)"></div>
      <div><label>Precio unitario S/</label><input type="number" min="0" step="0.01" value="${t.price}" oninput="draftTiers[${i}].price=Number(this.value)"></div>
      <button type="button" class="danger-btn" onclick="removeTier(${i})">×</button>
    </div>`).join("");
}
function addTier(){draftTiers.push({min:1,price:0});renderTiers()}
function removeTier(i){draftTiers.splice(i,1);renderTiers()}
function renderImages(){
  $("imagesEditor").innerHTML=draftImages.map((url,i)=>`
    <div class="image-card ${i===0?"primary-image":""}">
      <img src="${url}" alt="">
      ${i===0?'<div class="primary-badge">Foto principal</div>':""}
      <div class="image-actions">
        ${i!==0?`<button type="button" onclick="makePrimary(${i})">Hacer principal</button>`:""}
        <button type="button" class="remove-image" onclick="removeImage(${i})">Eliminar</button>
      </div>
    </div>`).join("");
}
function makePrimary(i){const [u]=draftImages.splice(i,1);draftImages.unshift(u);renderImages()}
function removeImage(i){draftImages.splice(i,1);renderImages()}

$("imageInput").addEventListener("change",async e=>{
  if(!selected || !e.target.files.length)return;
  $("uploadStatus").textContent="Subiendo...";
  for(const file of e.target.files){
    const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
    const path=`${selected.slug}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safe}`;
    const {error}=await db.storage.from("product-images").upload(path,file,{cacheControl:"3600",upsert:false});
    if(error){$("uploadStatus").textContent=error.message;$("uploadStatus").className="msg error";return}
    const {data}=db.storage.from("product-images").getPublicUrl(path);
    draftImages.push(data.publicUrl);
  }
  $("uploadStatus").textContent="Fotos subidas. Presiona Guardar cambios.";
  $("uploadStatus").className="msg ok";
  renderImages();e.target.value="";
});

$("editorForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!selected)return;
  const tiers=[...draftTiers].map(t=>({min:Number(t.min),price:Number(t.price)})).sort((a,b)=>a.min-b.min);
  if(!tiers.length || tiers.some(t=>!t.min || t.price<0)){
    $("saveMsg").textContent="Revisa los tramos de precio.";$("saveMsg").className="msg error";return;
  }
  $("saveMsg").textContent="Guardando...";
  const payload={
    name:$("name").value.trim(),
    stock:Number($("stock").value),
    display_order:Number($("displayOrder").value),
    active:$("active").checked,
    tiers,
    images:draftImages,
    updated_at:new Date().toISOString()
  };
  const {error}=await db.from("products").update(payload).eq("id",selected.id);
  if(error){$("saveMsg").textContent=error.message;$("saveMsg").className="msg error";return}
  $("saveMsg").textContent="Cambios guardados.";$("saveMsg").className="msg ok";await loadProducts();
});

function slugify(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
async function newProduct(){
  const name=prompt("Nombre del nuevo producto:");
  if(!name)return;
  const slug=slugify(name)+"-"+Date.now().toString().slice(-5);
  const {data,error}=await db.from("products").insert({
    slug,name,stock:0,tiers:[{min:1,price:0}],images:[],active:false,display_order:products.length+1
  }).select().single();
  if(error){alert(error.message);return}
  await loadProducts();selectProduct(data.id);
}
init();
