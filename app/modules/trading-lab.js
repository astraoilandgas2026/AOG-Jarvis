const DEFAULT_RISK = Object.freeze({
  mode:"paper",startingCapital:20,maxRiskPerTradePct:1,maxExposurePct:5,maxDailyLossPct:2,
  maxOpenPositions:1,maxOrderNotional:1,maxPriceAgeMs:15000,leverage:1,killSwitch:true
});
export const TRADING_AGENTS=Object.freeze({
  freak_trades:{name:"Freak Trades",role:"strategy/opportunity research",execution:false,status:"reference"},
  jesse:{name:"Jesse",role:"backtest/optimization/paper/live adapter",execution:true,status:"adapter"},
  darwinia:{name:"Darwinia",role:"evolution/adversarial strategy research",execution:false,status:"adapter"},
  omni_route:{name:"OmniRoute",role:"AI provider routing/fallback",execution:false,status:"adapter"},
  openbook:{name:"OpenBook",role:"Solana CLOB/orderbook market source",execution:true,status:"adapter"},
  money_sharks:{name:"Money Sharks",role:"multi-agent live-trading benchmark",execution:false,status:"benchmark"},
  niulai4:{name:"NIULAI4",role:"Polymarket trader benchmark/reference",execution:false,status:"reference"},
  miula:{name:"Miula",role:"external agent research reference",execution:false,status:"reference"},
  ia4:{name:"IA4",role:"external agent research reference",execution:false,status:"reference"},
  e4:{name:"E4",role:"external agent research reference",execution:false,status:"reference"},
  realc:{name:"RealC",role:"external agent research reference",execution:false,status:"reference"}
});
export const TRADING_TOOLS=Object.freeze([
  {id:"trading.status",permission:"read",mode:"local"},{id:"trading.market",permission:"read",mode:"local"},
  {id:"trading.scan",permission:"read",mode:"local"},{id:"trading.backtest",permission:"read",mode:"adapter"},
  {id:"trading.paper",permission:"write",mode:"adapter"},{id:"trading.kill",permission:"write",mode:"local"},
  {id:"trading.research",permission:"read",mode:"local"}
]);
export function riskConfig(overrides={}){return {...DEFAULT_RISK,...overrides,leverage:1};}
export function riskGate(order={},config=DEFAULT_RISK,state={}){
  const c=riskConfig(config),equity=Math.max(Number(state.equity??c.startingCapital),0),qty=Number(order.quantity??0),price=Number(order.price??0);
  const notional=Math.max(qty,0)*Math.max(price,0),riskPct=Number(order.risk_pct??c.maxRiskPerTradePct);
  const exposurePct=equity?notional/equity*100:100,dailyLossPct=Number(state.daily_loss_pct??0);
  const reasons=[];
  if(c.killSwitch||state.killSwitch)reasons.push("KILL_SWITCH_ACTIVE");
  if(c.mode==="live"&&c.leverage!==1)reasons.push("LEVERAGE_BLOCKED");
  if(!Number.isFinite(qty)||qty<=0)reasons.push("INVALID_QUANTITY");
  if(!Number.isFinite(price)||price<=0)reasons.push("INVALID_PRICE");
  if(riskPct>c.maxRiskPerTradePct)reasons.push("RISK_PER_TRADE_LIMIT");
  if(exposurePct>c.maxExposurePct)reasons.push("EXPOSURE_LIMIT");
  if(notional>c.maxOrderNotional)reasons.push("ORDER_NOTIONAL_LIMIT");
  if(Number(state.open_positions??0)>=c.maxOpenPositions)reasons.push("OPEN_POSITION_LIMIT");
  if(dailyLossPct>=c.maxDailyLossPct)reasons.push("DAILY_LOSS_LIMIT");
  if(state.duplicateOrder)reasons.push("DUPLICATE_ORDER");
  if(state.dataStale)reasons.push("STALE_MARKET_DATA");
  return {allowed:reasons.length===0,reasons,notional,exposurePct,equity,riskPct,mode:c.mode};
}
export function validateCandles(candles=[],opts={}){
  const now=Date.now(),maxAge=Number(opts.maxAgeMs||DEFAULT_RISK.maxPriceAgeMs),clean=[];
  for(const c of candles){
    const close=Number(c.close??c[4]),openTime=Number(c.openTime??c[0]),closeTime=Number(c.closeTime??c[6]);
    if(!Number.isFinite(close)||close<=0)continue;
    if(Number.isFinite(openTime)&&Number.isFinite(closeTime)&&closeTime<openTime)continue;
    clean.push({...c,close});
  }
  const last=clean.at(-1),age=last&&Number.isFinite(Number(last.closeTime))?Math.max(0,now-Number(last.closeTime)):null;
  return {valid:clean.length>=60&&!last?false:clean.length>=60,dataStale:age!==null&&age>maxAge,count:clean.length,lastCloseTime:last?.closeTime??null,ageMs:age};
}
function ema(values,period){
  if(values.length<period)return null;const k=2/(period+1);let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<values.length;i++)e=values[i]*k+e*(1-k);return e;
}
export function scanOpportunity(candles=[],opts={}){
  const validation=validateCandles(candles,opts);if(!validation.valid)return {status:"insufficient_data",score:0,reason:"Need at least 60 valid candles",validation};
  if(validation.dataStale)return {status:"stale_data",score:0,reason:"Market data is stale",validation};
  const closes=candles.map(c=>Number(c.close??c[4])).filter(Number.isFinite),fast=ema(closes,20),slow=ema(closes,50);
  const last=closes.at(-1),prev=closes.at(-2),momentum=(last/prev-1)*100,trend=(fast/slow-1)*100;
  const volatility=Math.sqrt(closes.slice(-30).map((x,i,a)=>i?Math.pow(x/a[i-1]-1,2):0).reduce((a,b)=>a+b,0)/29)*100;
  const direction=trend>0&&momentum>0?"LONG":trend<0&&momentum<0?"SHORT":"NEUTRAL";
  const score=Math.max(0,Math.min(100,50+trend*120+momentum*80-volatility*2));
  return {status:"ok",symbol:opts.symbol||"unknown",interval:opts.interval||"unknown",direction,score:Number(score.toFixed(2)),last,
    indicators:{ema20:Number(fast.toFixed(8)),ema50:Number(slow.toFixed(8)),momentum_pct:Number(momentum.toFixed(4)),volatility_pct:Number(volatility.toFixed(4))},
    action:score>=70&&direction!=="NEUTRAL"?"WATCH":score>=55&&direction!=="NEUTRAL"?"PAPER_ONLY":"NO_TRADE",evidence:"MARKET_DATA_ONLY",validation};
}
export function buildResearchPlan(signal={}){
  return {status:"planned",gates:[
    {step:1,name:"opportunity_scan",required:true},
    {step:2,name:"multi_agent_research",agents:["freak_trades","darwinia","omni_route"],required:true},
    {step:3,name:"historical_backtest",provider:"jesse",required:true},
    {step:4,name:"significance_test",provider:"jesse",required:true},
    {step:5,name:"monte_carlo",provider:"jesse",required:true},
    {step:6,name:"walk_forward",provider:"jesse",required:true},
    {step:7,name:"paper_trading",required:true},
    {step:8,name:"risk_gate",required:true},
    {step:9,name:"live_execution",required:false}
  ],signal};
}
export function tradingStatus(env={}){
  return {mode:env.TRADING_MODE||DEFAULT_RISK.mode,live_enabled:String(env.LIVE_TRADING_ENABLED||"false")==="true",
    leverage:1,kill_switch:true,agents:TRADING_AGENTS,risk:riskConfig({mode:env.TRADING_MODE||DEFAULT_RISK.mode})};
}
