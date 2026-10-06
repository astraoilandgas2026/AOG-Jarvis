const DEFAULT_RISK = Object.freeze({
  mode: "paper",
  startingCapital: 20,
  maxRiskPerTradePct: 1,
  maxExposurePct: 5,
  maxDailyLossPct: 2,
  leverage: 1,
  killSwitch: true
});
export const TRADING_AGENTS = Object.freeze({
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
export const TRADING_TOOLS = Object.freeze([
  {id:"trading.status",permission:"read",mode:"local"},
  {id:"trading.market",permission:"read",mode:"local"},
  {id:"trading.scan",permission:"read",mode:"local"},
  {id:"trading.backtest",permission:"read",mode:"adapter"},
  {id:"trading.paper",permission:"write",mode:"adapter"},
  {id:"trading.kill",permission:"write",mode:"local"},
  {id:"trading.research",permission:"read",mode:"local"}
]);
export function riskConfig(overrides={}){return {...DEFAULT_RISK,...overrides,leverage:1};}
export function riskGate(order={},config=DEFAULT_RISK,state={}){
  const c=riskConfig(config),equity=Math.max(Number(state.equity??c.startingCapital),0),qty=Math.max(Number(order.quantity??0),0),price=Math.max(Number(order.price??0),0);
  const notional=qty*price,riskPct=Number(order.risk_pct??c.maxRiskPerTradePct),exposurePct=equity?notional/equity*100:100,dailyLossPct=Number(state.daily_loss_pct??0),reasons=[];
  if(c.killSwitch||state.killSwitch)reasons.push("KILL_SWITCH_ACTIVE");
  if(c.mode==="live"&&c.leverage!==1)reasons.push("LEVERAGE_BLOCKED");
  if(riskPct>c.maxRiskPerTradePct)reasons.push("RISK_PER_TRADE_LIMIT");
  if(exposurePct>c.maxExposurePct)reasons.push("EXPOSURE_LIMIT");
  if(dailyLossPct>=c.maxDailyLossPct)reasons.push("DAILY_LOSS_LIMIT");
  return {allowed:reasons.length===0,reasons,notional,exposurePct,equity,riskPct,mode:c.mode};
}
function ema(values,period){
  if(values.length<period)return null;
  const k=2/(period+1);let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<values.length;i++)e=values[i]*k+e*(1-k);
  return e;
}
export function scanOpportunity(candles=[],opts={}){
  const closes=candles.map(c=>Number(c.close??c[4])).filter(Number.isFinite);
  if(closes.length<60)return {status:"insufficient_data",score:0,reason:"Need at least 60 closes"};
  const fast=ema(closes,20),slow=ema(closes,50),last=closes.at(-1),prev=closes.at(-2),momentum=(last/prev-1)*100,trend=fast&&slow?(fast/slow-1)*100:0;
  const volatility=Math.sqrt(closes.slice(-30).map((x,i,a)=>i?Math.pow(x/a[i-1]-1,2):0).reduce((a,b)=>a+b,0)/29)*100;
  const direction=trend>0&&momentum>0?"LONG":trend<0&&momentum<0?"SHORT":"NEUTRAL";
  const score=Math.max(0,Math.min(100,50+trend*120+momentum*80-volatility*2));
  return {status:"ok",symbol:opts.symbol||"unknown",interval:opts.interval||"unknown",direction,score:Number(score.toFixed(2)),last,indicators:{ema20:Number(fast.toFixed(8)),ema50:Number(slow.toFixed(8)),momentum_pct:Number(momentum.toFixed(4)),volatility_pct:Number(volatility.toFixed(4))},action:score>=70&&direction!=="NEUTRAL"?"WATCH":score>=55&&direction!=="NEUTRAL"?"PAPER_ONLY":"NO_TRADE",evidence:"MARKET_DATA_ONLY"};
}
export function tradingStatus(env={}){
  return {mode:env.TRADING_MODE||DEFAULT_RISK.mode,live_enabled:String(env.LIVE_TRADING_ENABLED||"false")==="true",leverage:1,kill_switch:true,agents:TRADING_AGENTS,risk:riskConfig({mode:env.TRADING_MODE||DEFAULT_RISK.mode})};
}
