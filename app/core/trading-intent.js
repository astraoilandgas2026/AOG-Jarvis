export function classifyTradingIntent(text=""){
  const q=String(text).trim().toLowerCase();
  if(!/(trading|trade|daytrading|day trading|scalp|scalping|mercado|market|btc|bitcoin|eth|ethereum|polymarket|oportunidades|oportunidad|jesse|freqtrade|darwinia|money sharks|openbook|freak trades|binance|saldo|balance|cuenta|exchange)/i.test(q))return null;
  if(/(?:mata|kill|emergency|detén|deten|apaga|stop).*(?:trading|bot|operación|operacion)/i.test(q))return {type:"tool",tool:"trading.kill"};
  if(/(?:binance|saldo|balance|cuenta).*(?:binance|trading|exchange)?/i.test(q)&&/(?:estado|status|salud|health|conect|saldo|balance|cuenta)/i.test(q))return {type:"tool",tool:"binance.status"};
  if(/(?:estado|status|salud|health).*(?:trading|bot|trading lab)/i.test(q))return {type:"tool",tool:"trading.status"};
  if(/(?:backtest|backtesting|prueba histórica|prueba historica|histórico|historico)/i.test(q))return {type:"tool",tool:"trading.backtest"};
  if(/(?:binance).*(?:compra|comprar|buy|vende|vender|sell).*(?:paper|testnet|simulad|demo|sin dinero)?|(?:paper|testnet).*(?:binance).*(?:compra|comprar|buy|vende|vender|sell)/i.test(q))return {type:"tool",tool:"binance.paper-order"};
  if(/(?:paper|simulad|demo|sin dinero)/i.test(q))return {type:"tool",tool:"trading.paper"};
  if(/(?:investiga|research|agente|jesse|darwinia|money sharks|niulai4|miula|ia4|e4|realc|freak trades|openbook|omniroute)/i.test(q))return {type:"tool",tool:"trading.research"};
  if(/(?:oportunidad|oportunidades|daytrading|scalp|señal|senal|setup|entrada|long|short|mercado|market)/i.test(q))return {type:"tool",tool:"trading.scan"};
  return {type:"tool",tool:"trading.market"};
}
