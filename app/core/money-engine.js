const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
export const MONEY_DOMAINS=Object.freeze(["trading","arbitrage","procurement","digital","services","other"]);
export function scoreOpportunity(o={}){
  const expectedReturn=Number(o.expected_return_pct)||0;
  const winRate=Number(o.win_rate_pct)||0;
  const risk=Number(o.risk_pct)||0;
  const capital=Number(o.capital_required)||0;
  const effort=Number(o.effort_score)||0;
  const evidence=clamp(Number(o.evidence_score)||0);
  const edge=Math.max(0,(expectedReturn*Math.max(winRate,1)/100));
  const riskAdjusted=edge/(1+Math.max(risk,0)/10);
  const capitalPenalty=capital>0?Math.min(30,Math.log10(capital+1)*8):0;
  const score=clamp(riskAdjusted*3+evidence*.35+clamp(100-effort)*.1-capitalPenalty);
  return {score:Number(score.toFixed(2)),expected_value_pct:Number(edge.toFixed(4)),risk_adjusted_edge:Number(riskAdjusted.toFixed(4)),capital_penalty:Number(capitalPenalty.toFixed(2)),decision:score>=75?"PROMOTE":score>=55?"EXPERIMENT":"REJECT"};
}
export function rankOpportunities(items=[]){return items.map(x=>({...x,ranking:scoreOpportunity(x)})).sort((a,b)=>b.ranking.score-a.ranking.score);}
export function capitalAllocation(items=[],capital=20){
  const ranked=rankOpportunities(items).filter(x=>x.ranking.decision!=="REJECT");
  const total=ranked.reduce((s,x)=>s+Math.max(x.ranking.score,0),0)||1;
  return ranked.map(x=>({...x,allocated_capital:Number((capital*x.ranking.score/total).toFixed(2))}));
}
export function moneyExperimentGate(r={}){
  const checks=[
    ["evidence",Number(r.evidence_score)>=70],
    ["out_of_sample",Boolean(r.out_of_sample)],
    ["walk_forward",Boolean(r.walk_forward)],
    ["costs_included",Boolean(r.costs_included)],
    ["stress_test",Boolean(r.stress_test)],
    ["paper_result",Number(r.paper_return_pct)>=0],
    ["risk_pass",Boolean(r.risk_pass)]
  ];
  const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
  return {eligible:failed.length===0,failed,checks};
}
