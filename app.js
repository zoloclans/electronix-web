const cfg = window.ELECTRONIX_CONFIG;
const hasSupabaseConfig =
  cfg &&
  cfg.SUPABASE_URL &&
  !cfg.SUPABASE_URL.startsWith("PON_AQUI") &&
  cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_ANON_KEY.startsWith("PON_AQUI");

const db = hasSupabaseConfig
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

function placeholder(label){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
    <rect width="100%" height="100%" fill="#eceff2"/>
    <rect x="280" y="280" width="340" height="340" rx="27" fill="#3b4149"/>
    <rect x="337" y="337" width="226" height="226" rx="10" fill="#181a1e"/>
    <g stroke="#858c95" stroke-width="16">
      <path d="M248 330h-72M248 398h-72M248 466h-72M248 534h-72"/>
      <path d="M652 330h72M652 398h72M652 466h72M652 534h72"/>
    </g>
    <text x="450" y="725" text-anchor="middle" font-family="Segoe UI,Arial" font-size="43" font-weight="600" fill="#4a5058">${label}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

const demoProducts = [
  {id:"demo-1",slug:"pic18f57q43",name:"PIC18F57Q43",stock:18,tiers:[{min:1,price:145},{min:6,price:140},{min:12,price:136}],images:[]},
  {id:"demo-2",slug:"pic18f47q10",name:"PIC18F47Q10",stock:24,tiers:[{min:1,price:139},{min:6,price:134},{min:12,price:130}],images:[]},
  {id:"demo-3",slug:"epm240t100c5",name:"CPLD EPM240T100C5",stock:10,tiers:[{min:1,price:89},{min:4,price:84},{min:8,price:80}],images:[]},
  {id:"demo-4",slug:"usb-blaster",name:"USB BLASTER",stock:30,tiers:[{min:1,price:39},{min:5,price:36},{min:10,price:33}],images:[]}
];

let products = [];
let quantities = {};
let currentProduct = null;
let cart = [];
let galleryProduct = null;
let galleryIndex = 0;

const money = v => "S/ " + Number(v).toFixed(2);

function normalizeProduct(p){
  const tiers = Array.isArray(p.tiers) ? p.tiers : [];
  const images = Array.isArray(p.images) ? p.images : [];
  return {
    ...p,
    stock:Number(p.stock || 0),
    restock:String(p.restock || "").trim(),
    tiers:tiers.map(t=>({min:Number(t.min),price:Number(t.price)})).sort((a,b)=>a.min-b.min),
    images
  };
}

async function loadProducts(){
  if(!db){
    products = demoProducts.map(normalizeProduct);
  }else{
    const {data,error} = await db
      .from("products")
      .select("*")
      .eq("active", true)
      .order("display_order",{ascending:true});

    if(error){
      console.error(error);
      products = demoProducts.map(normalizeProduct);
    }else{
      products = (data || []).map(normalizeProduct);
    }
  }

  products.forEach(p=>{
    if(!quantities[p.id]) quantities[p.id] = 1;
  });

  renderProducts();
}

function priceFor(product,qty){
  if(!product.tiers.length) return 0;
  let price = product.tiers[0].price;
  for(const tier of product.tiers){
    if(qty >= tier.min) price = tier.price;
  }
  return price;
}
function activeTierIndex(product,qty){
  let idx=0;
  product.tiers.forEach((tier,i)=>{ if(qty >= tier.min) idx=i; });
  return idx;
}
function stockClass(stock){
  if(stock<=0) return "stock-out";
  if(stock<=5) return "stock-low";
  return "stock-ok";
}
function stockText(stock){
  if(stock<=0) return "Stock: Agotado";
  return `Stock: ${stock} unidades`;
}

function restockText(product){
  if(product.stock > 0 || !product.restock) return "";
  return `<div class="restock-message">📦 ${product.restock}</div>`;
}

function mainImage(product){
  return product.images?.[0] || placeholder(product.name);
}

function renderProducts(){
  document.getElementById("productos").innerHTML = products.map(product=>{
    const qty = Math.max(1, Math.min(product.stock || 1, quantities[product.id] || 1));
    quantities[product.id]=qty;
    const unitPrice = priceFor(product,qty);
    const tierIndex = activeTierIndex(product,qty);

    return `<article class="producto">
      <div class="foto" onclick="openGallery('${product.id}',0)">
        <img src="${mainImage(product)}" alt="${product.name}">
      </div>

      <div class="info">
        <div class="name-row">
          <div class="nombre">${product.name}</div>
          <div class="stock-badge ${stockClass(product.stock)}">${stockText(product.stock)}</div>
        </div>

        ${restockText(product)}

        <div class="price-row">
          <div>
            <div class="precio">${money(unitPrice)}</div>
            <div class="unit-label">por unidad</div>
          </div>
        </div>

        <div class="qty-line">
          <div class="qty">
            <button onclick="changeQty('${product.id}',-1)">−</button>
            <input type="number" min="1" max="${product.stock}" value="${qty}" oninput="setQty('${product.id}',this.value)">
            <button onclick="changeQty('${product.id}',1)">+</button>
          </div>
          <div class="tier-now">${qty} ${qty===1?"unidad":"unidades"}<br><b>${money(unitPrice)} c/u</b></div>
        </div>

        <div class="tiers">
          ${product.tiers.map((tier,i)=>`
            <div class="tier ${i===tierIndex?"active":""}">
              ${i===product.tiers.length-1 ? `x${tier.min}+` : `x${tier.min}`}
              <b>${money(tier.price)}</b>
            </div>`).join("")}
        </div>

        <div class="actions">
          <button class="btn add" onclick="addToCart('${product.id}')" ${product.stock<=0?"disabled":""}>Añadir al carrito</button>
          <button class="btn buy" onclick="openBuy('${product.id}')" ${product.stock<=0?"disabled":""}>Comprar</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function changeQty(id,step){
  const p=products.find(x=>x.id===id);
  if(!p || p.stock<=0) return;
  quantities[id]=Math.max(1,Math.min(p.stock,(quantities[id]||1)+step));
  renderProducts();
}
function setQty(id,value){
  const p=products.find(x=>x.id===id);
  if(!p || p.stock<=0) return;
  quantities[id]=Math.max(1,Math.min(p.stock,parseInt(value)||1));
  renderProducts();
}
function openBuy(id){
  currentProduct=products.find(p=>p.id===id);
  const qty=quantities[id];
  const unitPrice=priceFor(currentProduct,qty);
  const total=unitPrice*qty;
  buyName.textContent=currentProduct.name;
  buyQtyText.textContent=qty;
  buyUnitPrice.textContent=money(unitPrice);
  buyTotal.textContent=money(total);
  buyMessage.textContent=`Quiero comprar ${qty} ${qty===1?"unidad":"unidades"} de ${currentProduct.name} a ${money(unitPrice)} por unidad. Total: ${money(total)}.`;
  overlay.classList.add("show");
  buyModal.classList.add("show");
}
function closeBuy(){
  buyModal.classList.remove("show");
  if(!drawer.classList.contains("show")) overlay.classList.remove("show");
}
function sendCurrentWhatsApp(){
  if(!currentProduct) return;
  const qty=quantities[currentProduct.id];
  const unit=priceFor(currentProduct,qty);
  const total=unit*qty;
  const text=`Hola, quiero comprar ${qty} ${qty===1?"unidad":"unidades"} de ${currentProduct.name}.\nPrecio por unidad: ${money(unit)}\nTotal: ${money(total)}\n¿Podemos coordinar la entrega?`;
  window.open(`https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,"_blank");
}
function addCurrentToCart(){ if(currentProduct){addToCart(currentProduct.id);closeBuy();openCart();} }
function addToCart(id){
  const p=products.find(x=>x.id===id); if(!p || p.stock<=0) return;
  const qty=quantities[id];
  const item=cart.find(x=>x.id===id);
  if(item) item.qty=Math.min(p.stock,item.qty+qty);
  else cart.push({id,qty});
  refreshCart();
}
function refreshCart(){
  cartCount.textContent=cart.reduce((s,x)=>s+x.qty,0);
  if(!cart.length){cartList.innerHTML='<div class="empty">El carrito está vacío.</div>';cartTotal.textContent=money(0);return}
  let grand=0;
  cartList.innerHTML=cart.map(item=>{
    const p=products.find(x=>x.id===item.id);
    const unit=priceFor(p,item.qty), total=unit*item.qty; grand+=total;
    return `<div class="cart-item">
      <div class="cart-thumb"><img src="${mainImage(p)}" alt=""></div>
      <div><div class="cart-name">${p.name}</div><div class="cart-sub">${item.qty} × ${money(unit)} c/u</div></div>
      <div style="text-align:right"><div style="font-size:11px;font-weight:650">${money(total)}</div><button class="remove" onclick="removeCart('${p.id}')">Quitar</button></div>
    </div>`;
  }).join("");
  cartTotal.textContent=money(grand);
}
function removeCart(id){cart=cart.filter(x=>x.id!==id);refreshCart()}
function openCart(){refreshCart();overlay.classList.add("show");drawer.classList.add("show")}
function closeCart(){drawer.classList.remove("show");overlay.classList.remove("show")}
function checkoutCart(){
  if(!cart.length)return;
  let lines=["Hola, quiero comprar:"]; let grand=0;
  cart.forEach(item=>{
    const p=products.find(x=>x.id===item.id);
    const unit=priceFor(p,item.qty), total=unit*item.qty;grand+=total;
    lines.push(`• ${item.qty} x ${p.name} — ${money(unit)} c/u — ${money(total)}`);
  });
  lines.push(`Total: ${money(grand)}`,"¿Podemos coordinar la entrega?");
  window.open(`https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`,"_blank");
}
function closeAll(){closeBuy();closeCart()}

function openGallery(id,index){
  galleryProduct=products.find(p=>p.id===id);galleryIndex=index;
  galleryTitle.textContent=galleryProduct.name;
  gallery.classList.add("show");renderGallery();
}
function galleryImages(){
  return galleryProduct.images?.length ? galleryProduct.images : [placeholder(galleryProduct.name)];
}
function renderGallery(){
  const imgs=galleryImages();
  galleryMain.src=imgs[galleryIndex];
  thumbs.innerHTML=imgs.map((img,i)=>`<button class="thumb ${i===galleryIndex?"active":""}" onclick="galleryIndex=${i};renderGallery()"><img src="${img}" alt=""></button>`).join("");
}
function moveGallery(step){
  const imgs=galleryImages();
  galleryIndex=(galleryIndex+step+imgs.length)%imgs.length;renderGallery();
}
function closeGallery(){gallery.classList.remove("show")}
let touchStartX=0;
galleryMain.addEventListener("touchstart",e=>{touchStartX=e.changedTouches[0].screenX},{passive:true});
galleryMain.addEventListener("touchend",e=>{const d=e.changedTouches[0].screenX-touchStartX;if(Math.abs(d)>45)moveGallery(d>0?-1:1)},{passive:true});

loadProducts();
refreshCart();
setInterval(loadProducts,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadProducts()});
