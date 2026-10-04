const ORBS=[
  {id:"aurora",name:"Aurora",description:"serena, estratégica y elegante",core:"aurora",motion:"orb-aura"},
  {id:"nova",name:"Nova",description:"enérgica, curiosa y exploradora",core:"nova",motion:"orb-nova"},
  {id:"singularity",name:"Singularity",description:"analítica, profunda y minimalista",core:"singularity",motion:"orb-singularity"},
  {id:"ember",name:"Ember",description:"cálida, protectora y decidida",core:"ember",motion:"orb-ember"}
];
export function chooseOrb(personality="Emma"){
  const p=String(personality).toLowerCase();
  if(/estrat|anal|procurement|oracle|protect|risk/.test(p)) return ORBS[2];
  if(/curios|explor|research|web/.test(p)) return ORBS[1];
  if(/calid|human|protect/.test(p)) return ORBS[3];
  return ORBS[0];
}
export function getOrbs(){return ORBS.slice()}
