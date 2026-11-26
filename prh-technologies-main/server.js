const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const uploadDir = path.join(ROOT, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(ROOT, "prh.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS admins(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS laptops(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 listing_id TEXT UNIQUE NOT NULL,
 brand TEXT NOT NULL,
 model TEXT NOT NULL,
 price INTEGER NOT NULL,
 negotiable INTEGER DEFAULT 0,
 processor TEXT,
 ram TEXT,
 storage TEXT,
 graphics TEXT,
 display TEXT,
 battery TEXT,
 purchase_year INTEGER,
 condition TEXT,
 city TEXT,
 description TEXT,
 status TEXT DEFAULT 'Draft',
 label TEXT,
 contact_number TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS laptop_images(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 laptop_id INTEGER NOT NULL,
 filename TEXT NOT NULL,
 sort_order INTEGER DEFAULT 0,
 FOREIGN KEY(laptop_id) REFERENCES laptops(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS brands(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS locations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY AUTOINCREMENT,admin_id INTEGER,action TEXT,details TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,admin_id INTEGER,title TEXT,message TEXT,is_read INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
`);

const settingDefaults = {
  company_name:"PRH Technologies",
  tagline:"Quality Laptops at the Right Price",
  phone:"8123751594",
  whatsapp:"8123751594",
  email:"prhtechnologies@gmail.com",
  city:"Bengaluru, Karnataka",
  delivery:"Pan-India delivery",
  company_description:"PRH Technologies offers quality laptops at competitive prices. We provide a wide range of laptops for students, professionals, businesses, and everyday use, with options to suit different budgets and requirements."
};
const insSetting = db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)");
for (const [k,v] of Object.entries(settingDefaults)) insSetting.run(k,v);

for (const x of ["Dell","HP","Lenovo","ASUS","Acer","Apple","MSI","Microsoft"]) db.prepare("INSERT OR IGNORE INTO brands(name) VALUES(?)").run(x);
// Normalize existing laptop brand values to the managed brand names (e.g. hp -> HP).
for (const b of db.prepare("SELECT name FROM brands").all()) {
  db.prepare("UPDATE laptops SET brand=? WHERE LOWER(brand)=LOWER(?)").run(b.name, b.name);
}
for (const x of ["Business","Gaming","Student","Ultrabook","Professional"]) db.prepare("INSERT OR IGNORE INTO categories(name) VALUES(?)").run(x);
for (const x of ["Bengaluru","Hyderabad","Chennai","Pune","Mumbai","Delhi"]) db.prepare("INSERT OR IGNORE INTO locations(name) VALUES(?)").run(x);

if (!db.prepare("SELECT id FROM admins LIMIT 1").get()) {
  const email = process.env.ADMIN_EMAIL || "owner@prhtechnologies.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe@123";
  db.prepare("INSERT INTO admins(name,email,password_hash) VALUES(?,?,?)")
    .run("PRH Owner", email, bcrypt.hashSync(password, 12));
  console.log(`Initial admin: ${email} / ${password}`);
}

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:8*60*60*1000}
}));
app.use(express.static(path.join(ROOT,"public")));

const storage = multer.diskStorage({
 destination:(req,file,cb)=>cb(null,uploadDir),
 filename:(req,file,cb)=>{
   const ext=path.extname(file.originalname).toLowerCase();
   cb(null,crypto.randomUUID()+ext);
 }
});
const upload = multer({
 storage,
 limits:{files:10,fileSize:8*1024*1024},
 fileFilter:(req,file,cb)=>{
   cb(null,["image/jpeg","image/png","image/webp"].includes(file.mimetype));
 }
});

function admin(req,res,next){ if(!req.session.adminId) return res.status(401).json({error:"Admin login required"}); next(); }
function log(req,action,details=""){
 db.prepare("INSERT INTO activity_log(admin_id,action,details) VALUES(?,?,?)").run(req.session.adminId,action,details);
}
function notify(req,title,message){
 db.prepare("INSERT INTO notifications(admin_id,title,message) VALUES(?,?,?)").run(req.session.adminId,title,message);
}
function settings(){
 return Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value]));
}
function canonicalBrand(value){
 const raw=String(value||"").trim();
 if(!raw)return "";
 const found=db.prepare("SELECT name FROM brands WHERE LOWER(name)=LOWER(?)").get(raw);
 return found ? found.name : raw;
}
function publicLaptop(row){
 const imageRows=db.prepare("SELECT id,filename FROM laptop_images WHERE laptop_id=? ORDER BY sort_order,id").all(row.id);
 return {...row,images:imageRows.map(x=>"/uploads/"+x.filename),image_ids:imageRows.map(x=>x.id)};
}

// Auth
app.post("/api/auth/login",(req,res)=>{
 const {email,password}=req.body||{};
 const a=db.prepare("SELECT * FROM admins WHERE email=?").get(email);
 if(!a || !bcrypt.compareSync(password||"",a.password_hash)) return res.status(401).json({error:"Invalid email or password"});
 req.session.adminId=a.id;
 res.json({ok:true,name:a.name,email:a.email});
});
app.post("/api/auth/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/auth/me",(req,res)=>{
 if(!req.session.adminId) return res.status(401).json({error:"Not logged in"});
 const a=db.prepare("SELECT id,name,email FROM admins WHERE id=?").get(req.session.adminId);
 res.json(a);
});

// Public
app.get("/api/settings",(req,res)=>res.json(settings()));
app.get("/api/brands",(req,res)=>{const rows=db.prepare("SELECT * FROM brands ORDER BY name").all();res.json(Array.isArray(rows)?rows:[])});
app.get("/api/categories",(req,res)=>res.json(db.prepare("SELECT * FROM categories ORDER BY name").all()));
app.get("/api/locations",(req,res)=>{const rows=db.prepare("SELECT * FROM locations ORDER BY name").all();res.json(Array.isArray(rows)?rows:[])});

app.get("/api/laptops",(req,res)=>{
 const {q="",brand="",minPrice="",maxPrice="",ram="",storage="",graphics="",condition="",city="",sort="newest"}=req.query;
 let sql=`SELECT * FROM laptops WHERE status='Published'`;
 const params=[];
 if(q){sql+=` AND (brand LIKE ? OR model LIKE ? OR processor LIKE ? OR ram LIKE ? OR storage LIKE ? OR graphics LIKE ? OR description LIKE ?)`; const z=`%${q}%`; params.push(z,z,z,z,z,z,z)}
 if(brand){sql+=" AND brand=?";params.push(brand)}
 if(minPrice){sql+=" AND price>=?";params.push(Number(minPrice))}
 if(maxPrice){sql+=" AND price<=?";params.push(Number(maxPrice))}
 if(ram){sql+=" AND ram=?";params.push(ram)}
 if(storage){sql+=" AND storage=?";params.push(storage)}
 if(graphics){sql+=" AND graphics=?";params.push(graphics)}
 if(condition){sql+=" AND condition=?";params.push(condition)}
 if(city){sql+=" AND city=?";params.push(city)}
 if(sort==="price_asc")sql+=" ORDER BY price ASC";
 else if(sort==="price_desc")sql+=" ORDER BY price DESC";
 else if(sort==="name")sql+=" ORDER BY brand,model";
 else sql+=" ORDER BY datetime(created_at) DESC";
 const rows=db.prepare(sql).all(...params).map(publicLaptop);
 res.json(rows);
});
app.get("/api/laptops/:id",(req,res)=>{
 const r=db.prepare("SELECT * FROM laptops WHERE listing_id=? AND status='Published'").get(req.params.id);
 if(!r)return res.status(404).json({error:"Laptop not found"});
 res.json(publicLaptop(r));
});

// Admin laptop management
app.get("/api/admin/laptops",admin,(req,res)=>{
 const rows=db.prepare("SELECT * FROM laptops ORDER BY datetime(created_at) DESC").all().map(publicLaptop);
 res.json(rows);
});
app.post("/api/admin/laptops",admin,upload.array("photos",10),(req,res)=>{
 const b=req.body;
 b.brand=canonicalBrand(b.brand);
 if(!b.brand||!b.model||!b.price)return res.status(400).json({error:"Brand, model and price are required"});
 const allowedStatuses=["Draft","Published","Out of Stock"];
 if(!allowedStatuses.includes(b.status||"Draft"))return res.status(400).json({error:"Invalid listing status"});
 const listingId="PRH-"+String((db.prepare("SELECT COALESCE(MAX(id),0)+1 n FROM laptops").get().n)).padStart(4,"0");
 const info=db.prepare(`INSERT INTO laptops(listing_id,brand,model,price,negotiable,processor,ram,storage,graphics,display,battery,purchase_year,condition,city,description,status,label,contact_number)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
 listingId,b.brand,b.model,Number(b.price),b.negotiable?1:0,b.processor||"",b.ram||"",b.storage||"",b.graphics||"",b.display||"",b.battery||"",b.purchase_year||null,b.condition||"",b.city||"",b.description||"",b.status||"Draft",b.label||"",b.contact_number||settings().phone
 );
 const files=req.files||[];
 files.forEach((f,i)=>db.prepare("INSERT INTO laptop_images(laptop_id,filename,sort_order) VALUES(?,?,?)").run(info.lastInsertRowid,f.filename,i));
 log(req,"Laptop created",listingId+" "+b.brand+" "+b.model);
 notify(req,"New laptop added",listingId+" was created.");
 res.json({ok:true,listingId});
});
app.put("/api/admin/laptops/:id",admin,upload.array("photos",10),(req,res)=>{
 const old=db.prepare("SELECT * FROM laptops WHERE listing_id=?").get(req.params.id);
 if(!old)return res.status(404).json({error:"Not found"});
 const b=req.body;
 b.brand=canonicalBrand(b.brand);
 if(!b.brand||!b.model||!b.price)return res.status(400).json({error:"Brand, model and price are required"});
 const allowedStatuses=["Draft","Published","Out of Stock"];
 if(!allowedStatuses.includes(b.status||"Draft"))return res.status(400).json({error:"Invalid listing status"});
 db.prepare(`UPDATE laptops SET brand=?,model=?,price=?,negotiable=?,processor=?,ram=?,storage=?,graphics=?,display=?,battery=?,purchase_year=?,condition=?,city=?,description=?,status=?,label=?,contact_number=?,updated_at=CURRENT_TIMESTAMP WHERE listing_id=?`)
 .run(b.brand,b.model,Number(b.price),b.negotiable?1:0,b.processor||"",b.ram||"",b.storage||"",b.graphics||"",b.display||"",b.battery||"",b.purchase_year||null,b.condition||"",b.city||"",b.description||"",b.status||"Draft",b.label||"",b.contact_number||settings().phone,req.params.id);
 (req.files||[]).forEach((f,i)=>db.prepare("INSERT INTO laptop_images(laptop_id,filename,sort_order) VALUES(?,?,?)").run(old.id,f.filename,Date.now()+i));
 log(req,"Laptop updated",req.params.id);
 res.json({ok:true});
});
app.post("/api/admin/laptops/:id/images/reorder",admin,(req,res)=>{
 const laptop=db.prepare("SELECT id FROM laptops WHERE listing_id=?").get(req.params.id);
 if(!laptop)return res.status(404).json({error:"Laptop not found"});
 const ids=Array.isArray(req.body.imageIds)?req.body.imageIds.map(Number).filter(Number.isInteger):[];
 const rows=db.prepare("SELECT id FROM laptop_images WHERE laptop_id=? ORDER BY sort_order,id").all(laptop.id).map(x=>x.id);
 if(ids.length!==rows.length || ids.some(id=>!rows.includes(id)))return res.status(400).json({error:"Invalid image order"});
 const tx=db.transaction(list=>{const q=db.prepare("UPDATE laptop_images SET sort_order=? WHERE id=? AND laptop_id=?");list.forEach((imageId,i)=>q.run(i,imageId,laptop.id));});
 tx(ids);
 log(req,"Laptop photos reordered",req.params.id);
 res.json({ok:true});
});
app.delete("/api/admin/laptops/:id/images/:imageId",admin,(req,res)=>{
 const laptop=db.prepare("SELECT id FROM laptops WHERE listing_id=?").get(req.params.id);
 if(!laptop)return res.status(404).json({error:"Laptop not found"});
 const image=db.prepare("SELECT * FROM laptop_images WHERE id=? AND laptop_id=?").get(Number(req.params.imageId),laptop.id);
 if(!image)return res.status(404).json({error:"Image not found"});
 const file=path.join(uploadDir,image.filename);
 if(fs.existsSync(file))fs.unlinkSync(file);
 db.prepare("DELETE FROM laptop_images WHERE id=?").run(image.id);
 db.prepare("UPDATE laptop_images SET sort_order=sort_order-1 WHERE laptop_id=? AND sort_order>? ").run(laptop.id,image.sort_order);
 log(req,"Laptop photo deleted",req.params.id);
 res.json({ok:true});
});

app.delete("/api/admin/laptops/:id",admin,(req,res)=>{
 const old=db.prepare("SELECT * FROM laptops WHERE listing_id=?").get(req.params.id);
 if(!old)return res.status(404).json({error:"Not found"});
 const files=db.prepare("SELECT filename FROM laptop_images WHERE laptop_id=?").all(old.id);
 for(const f of files){const p=path.join(uploadDir,f.filename);if(fs.existsSync(p))fs.unlinkSync(p)}
 db.prepare("DELETE FROM laptops WHERE id=?").run(old.id);
 log(req,"Laptop deleted",req.params.id);
 res.json({ok:true});
});

// Admin taxonomy/settings
for(const [route,table] of [["brands","brands"],["categories","categories"],["locations","locations"]]){
 app.get("/api/admin/"+route,admin,(req,res)=>res.json(db.prepare(`SELECT * FROM ${table} ORDER BY name`).all()));
 app.post("/api/admin/"+route,admin,(req,res)=>{
   try{const r=db.prepare(`INSERT INTO ${table}(name) VALUES(?)`).run(req.body.name.trim());log(req,`Added ${table}`,req.body.name);res.json({ok:true,id:r.lastInsertRowid})}
   catch(e){res.status(400).json({error:"Name already exists or is invalid"})}
 });
 app.delete("/api/admin/"+route+"/:id",admin,(req,res)=>{db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);log(req,`Deleted ${table}`,req.params.id);res.json({ok:true})});
}
app.get("/api/admin/settings",admin,(req,res)=>res.json(settings()));
app.put("/api/admin/settings",admin,(req,res)=>{
 const tx=db.transaction(obj=>{for(const [k,v] of Object.entries(obj))db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(k,String(v))});
 tx(req.body);log(req,"Website settings updated");notify(req,"Website settings changed","Website settings were updated.");res.json({ok:true});
});
app.get("/api/admin/activity",admin,(req,res)=>res.json(db.prepare("SELECT a.*,ad.name admin_name FROM activity_log a LEFT JOIN admins ad ON ad.id=a.admin_id ORDER BY datetime(a.created_at) DESC LIMIT 200").all()));
app.get("/api/admin/notifications",admin,(req,res)=>res.json(db.prepare("SELECT * FROM notifications ORDER BY datetime(created_at) DESC LIMIT 200").all()));
app.post("/api/admin/notifications/read-all",admin,(req,res)=>{db.prepare("UPDATE notifications SET is_read=1").run();res.json({ok:true})});
app.get("/api/admin/stats",admin,(req,res)=>res.json({
 total:db.prepare("SELECT COUNT(*) n FROM laptops").get().n,
 published:db.prepare("SELECT COUNT(*) n FROM laptops WHERE status='Published'").get().n,
 outOfStock:db.prepare("SELECT COUNT(*) n FROM laptops WHERE status='Out of Stock'").get().n,
 drafts:db.prepare("SELECT COUNT(*) n FROM laptops WHERE status='Draft'").get().n
}));

app.get("/api/admin/users",admin,(req,res)=>res.json(db.prepare("SELECT id,name,email,created_at FROM admins ORDER BY id").all()));
app.post("/api/admin/users",admin,(req,res)=>{
 const {name,email,password}=req.body;
 if(!name||!email||!password)return res.status(400).json({error:"Name, email and password required"});
 try{const r=db.prepare("INSERT INTO admins(name,email,password_hash) VALUES(?,?,?)").run(name,email,bcrypt.hashSync(password,12));log(req,"Admin created",email);notify(req,"New admin","New administrator account created.");res.json({ok:true,id:r.lastInsertRowid})}
 catch(e){res.status(400).json({error:"Email already exists"})}
});
app.delete("/api/admin/users/:id",admin,(req,res)=>{
 if(Number(req.params.id)===req.session.adminId)return res.status(400).json({error:"You cannot delete your own account"});
 db.prepare("DELETE FROM admins WHERE id=?").run(req.params.id);log(req,"Admin deleted",req.params.id);res.json({ok:true});
});

app.use((req,res)=>{
 if(req.path.startsWith("/api/")) return res.status(404).json({error:"API not found"});
 res.sendFile(path.join(ROOT,"public","index.html"));
});

app.listen(PORT,()=>console.log(`PRH Technologies running on http://localhost:${PORT}`));
