export function createStrategyHypothesis(input={}){
  const symbol=input.symbol||"UNKNOWN";
  const family=input.family||"momentum";
  return {id:"hyp-"+Date.now(),symbol,family,thesis:String(input.thesis||"").slice(0,2000),parameters:input.parameters||{},generated_by:"emma",status:"PROPOSED",gates:["BACKTEST","OUT_OF_SAMPLE","WALK_FORWARD","MONTE_CARLO","COSTS","PAPER","RISK"]};
}
export function evaluateStrategy(experiment={}){
  const required=["backtest","out_of_sample","walk_forward","monte_carlo","costs","paper","risk"];
  const failed=required.filter(k=>!experiment[k]);
  const returnPct=Number(experiment.paper_return_pct)||0;
  const drawdown=Number(experiment.max_drawdown_pct)||0;
  const robust=failed.length===0&&returnPct>0&&drawdown<Number(experiment.max_allowed_drawdown_pct||10);
  return {status:robust?"PROMOTE_TO_CANDIDATE":"REJECT",robust,failed,paper_return_pct:returnPct,max_drawdown_pct:drawdown};
}
