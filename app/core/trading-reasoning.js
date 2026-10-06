const norm=v=>String(v??"").trim();
export function buildTradingDebate(signal={},context={}){
  const base={symbol:norm(signal.symbol),direction:norm(signal.direction)||"NEUTRAL",score:Number(signal.score)||0};
  return {
    hypothesis:{...base,thesis:context.thesis||"Determine whether the signal contains durable risk-adjusted edge."},
    bull:{case:context.bull_case||"Trend/momentum may persist; quantify continuation probability.",questions:["What historical regime supports this?","What catalyst or structural edge exists?","What invalidates the thesis?"]},
    bear:{case:context.bear_case||"Signal may be noise, crowded or already priced.",questions:["Could this be overfit?","What happens out-of-sample?","What costs/slippage destroy the edge?"]},
    quant:{tests:["point_in_time","out_of_sample","walk_forward","monte_carlo","parameter_perturbation","costs_and_slippage"],required:true},
    risk:{limits:["max_loss","max_exposure","max_daily_loss","stale_data","duplicate_order"],fail_closed:true},
    decision:"RESEARCH_REQUIRED"
  };
}
export function synthesizeTradingDecision(debate={},metrics={}){
  const gate=Boolean(metrics.oos&&metrics.walk_forward&&metrics.monte_carlo&&metrics.costs&&metrics.risk);
  return {decision:gate?"PAPER_CANDIDATE":"REJECT_OR_RESEARCH",confidence:Number(Math.max(0,Math.min(100,Number(metrics.confidence)||0)).toFixed(2)),reasons:gate?["All required validation gates passed."]:["At least one validation gate is missing."],fail_closed:true};
}
