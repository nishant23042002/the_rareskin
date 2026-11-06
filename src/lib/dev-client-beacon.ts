/**
 * DEV ONLY. An inline script (ES5, runs before any bundle) that reports what a
 * real phone's browser does with the dev site to `POST /api/dev/client-log`,
 * which appends it to `.next/dev/logs/phone-client.log`. The page can look right
 * (server-rendered HTML) while nothing works (no hydration); nothing on a phone
 * shows why, and this tells: failed scripts (resource errors, HTTP >= 400),
 * uncaught errors and rejections, console.error (React hydration errors), whether
 * React hydrated, whether the HMR websocket opens, and the browser / viewport.
 * Rendered only when NODE_ENV !== "production" (see `src/app/layout.tsx`).
 */
export const DEV_CLIENT_BEACON = `(function(){
if(window.__rrsBeacon)return;window.__rrsBeacon=1;var n=0;
function send(o){if(n++>40)return;try{o.t=new Date().toISOString().slice(11,23);o.ua=navigator.userAgent;o.page=location.href;var s=JSON.stringify(o);
if(navigator.sendBeacon&&navigator.sendBeacon('/api/dev/client-log',s))return;var x=new XMLHttpRequest();x.open('POST','/api/dev/client-log');x.send(s);}catch(e){}}
window.addEventListener('error',function(e){var t=e.target;if(t&&t!==window&&(t.src||t.href)){send({k:'resource-error',src:t.src||t.href});}
else{send({k:'js-error',msg:String(e.message),file:e.filename,line:e.lineno,col:e.colno,stack:e.error&&e.error.stack?String(e.error.stack).slice(0,500):''});}},true);
window.addEventListener('unhandledrejection',function(e){var r=e.reason;send({k:'rejection',msg:String(r&&r.message||r),stack:r&&r.stack?String(r.stack).slice(0,500):''});});
var ce=console.error;console.error=function(){try{send({k:'console.error',msg:Array.prototype.slice.call(arguments).map(String).join(' ').slice(0,400)});}catch(e){}return ce.apply(console,arguments);};
function report(tag){var failed=[];try{performance.getEntriesByType('resource').forEach(function(r){if(r.responseStatus>=400)failed.push(r.responseStatus+' '+r.name.slice(-70));});}catch(e){}
var hydrated=false;try{for(var k in document){if(k.indexOf('__reactContainer')===0||k.indexOf('_reactListening')===0)hydrated=true;}}catch(e){}
send({k:'state',tag:tag,hydrated:hydrated,secure:window.isSecureContext,w:innerWidth,h:innerHeight,touch:navigator.maxTouchPoints,failed:failed});}
function ms(){return Math.round(performance.now());}
document.addEventListener('DOMContentLoaded',function(){send({k:'dcl',ms:ms()});});
window.addEventListener('load',function(){report('load');send({k:'load-ms',ms:ms()});setTimeout(function(){report('+5s');},5000);});
function isHydrated(){try{for(var k in document){if(k.indexOf('__reactContainer')===0)return true;}}catch(e){}return false;}
var hyd=setInterval(function(){if(isHydrated()){clearInterval(hyd);send({k:'hydrated',ms:ms()});}else if(ms()>120000){clearInterval(hyd);send({k:'never-hydrated',ms:ms()});}},500);
function pending(tag){var done={};try{performance.getEntriesByType('resource').forEach(function(r){done[r.name]=1;});}catch(e){}
var wait=[];[].slice.call(document.querySelectorAll('script[src],link[rel=stylesheet][href]')).forEach(function(e){var u=e.src||e.href;if(!done[u])wait.push('tag '+u.slice(-70));});
[].slice.call(document.images).forEach(function(i){if(!i.complete)wait.push('img '+(i.currentSrc||i.src).slice(-80));});
var slow=[];try{performance.getEntriesByType('resource').sort(function(a,b){return b.duration-a.duration;}).slice(0,3).forEach(function(r){slow.push(Math.round(r.duration)+'ms '+r.name.slice(-60));});}catch(e){}
send({k:'pending',tag:tag,ms:ms(),ready:document.readyState,hydrated:isHydrated(),waiting:wait.slice(0,8),n:wait.length,slowest:slow});}
setTimeout(function(){pending('+8s');},8000);setTimeout(function(){pending('+25s');},25000);
try{var ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/_next/hmr');ws.onopen=function(){send({k:'hmr-ws',s:'open'});ws.close();};ws.onerror=function(){send({k:'hmr-ws',s:'error'});};}catch(e){send({k:'hmr-ws',s:'throw '+e});}
})();`;
