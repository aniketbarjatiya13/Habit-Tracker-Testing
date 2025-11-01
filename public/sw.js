const CACHE_NAME = "habits-cache-v1";
const ASSETS = ["/","/index.html","/manifest.webmanifest"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME&&caches.delete(k)))))});
self.addEventListener("fetch",(e)=>{
  const {request}=e; if(request.method!=="GET") return;
  e.respondWith(caches.match(request).then(c=>c||fetch(request).then(r=>{const copy=r.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)); return r;}).catch(()=>c)));
});