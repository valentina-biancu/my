import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':['index.html','text/html'],'/app.mjs':['app.mjs','text/javascript'],'/model.mjs':['model.mjs','text/javascript'],'/style.css':['style.css','text/css']};
createServer(async(req,res)=>{
 const file=files[new URL(req.url,'http://localhost').pathname];
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
 if(req.method!=='GET'||!file){res.writeHead(404);res.end('Not found');return;}
 try{res.setHeader('Content-Type',file[1]);res.end(await readFile(new URL(file[0],import.meta.url)));}catch{res.writeHead(500);res.end('Preview unavailable');}
}).listen(4173,'127.0.0.1',()=>console.log('Synthetic My Navigator preview: http://127.0.0.1:4173'));
