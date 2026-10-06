import crypto from "node:crypto";
const DEFAULT_BASE="https://testnet.binance.vision";
const PROD_BASE="https://api.binance.com";
const timeoutMs=10000;
function baseUrl(env){if(env.BINANCE_BASE_URL)return String(env.BINANCE_BASE_URL).replace(/\/$/,"");return String(env.BINANCE_ENV||"testnet").toLowerCase()==="live"?PROD_BASE:DEFAULT_BASE;}
function credentials(env){return {key:String(env.BINANCE_API_KEY||""),secret:String(env.BINANCE_API_SECRET||"")};}
function sign(params,secret){const query=new URLSearchParams(params).toString();return {query,signature:crypto.createHmac("sha256",secret).update(query).digest("hex")};}
async function request(path,params={},env={},signed=false,method="GET"){
 const {key,secret}=credentials(env); if(signed&&(!key||!secret))return {ok:false,error:"BINANCE_CREDENTIALS_NOT_CONFIGURED"};
 const p={...params}; if(signed){p.timestamp=Date.now();p.recvWindow=5000;}
 const signedData=signed?sign(p,secret):{query:new URLSearchParams(p).toString(),signature:null};
 const suffix=signedData.query?("?"+signedData.query+(signedData.signature?"&signature="+signedData.signature:"")):"";
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const res=await fetch(baseUrl(env)+path+suffix,{method,headers:key?{"X-MBX-APIKEY":key}:{},signal:controller.signal});const raw=await res.text();let data;try{data=JSON.parse(raw);}catch{data={raw:raw.slice(0,4000)};}return {ok:res.ok,http_status:res.status,data,environment:baseUrl(env)===PROD_BASE?"live":"testnet"};}
 catch(error){return {ok:false,error:error?.name==="AbortError"?"TIMEOUT":String(error?.message||error)};} finally{clearTimeout(timer);}
}
export async function binanceStatus(env=process.env){const cred=credentials(env);const ping=await request("/api/v3/ping",{},env,false);const out={provider:"binance",environment:baseUrl(env)===PROD_BASE?"live":"testnet",credentials_configured:Boolean(cred.key&&cred.secret),ping};if(cred.key&&cred.secret)out.account=await request("/api/v3/account",{},env,true);return out;}
export async function binanceExchangeInfo(symbol,env=process.env){return request("/api/v3/exchangeInfo",{symbol:String(symbol||"BTCUSDT").toUpperCase()},env,false);}
export async function binanceBalance(env=process.env){return request("/api/v3/account",{},env,true);}
export async function binanceOrder(order={},env=process.env){
 if(String(env.BINANCE_TRADING_ENABLED||"false")!=="true")return {ok:false,error:"BINANCE_TRADING_DISABLED"};
 if(String(env.TRADING_MODE||"paper")!=="live")return {ok:false,error:"TRADING_MODE_NOT_LIVE"};
 if(String(env.LIVE_TRADING_ENABLED||"false")!=="true")return {ok:false,error:"LIVE_TRADING_DISABLED"};
 const allowed={symbol:order.symbol,side:order.side,type:order.type||"MARKET",quantity:order.quantity,quoteOrderQty:order.quoteOrderQty,price:order.price,timeInForce:order.timeInForce,newClientOrderId:order.newClientOrderId};
 for(const k of Object.keys(allowed))if(allowed[k]===undefined||allowed[k]===null||allowed[k]==="")delete allowed[k];
 if(!allowed.symbol||!allowed.side||(!allowed.quantity&&!allowed.quoteOrderQty))return {ok:false,error:"BINANCE_ORDER_PARAMS_INVALID"};
 return request("/api/v3/order",allowed,env,true,"POST");
}