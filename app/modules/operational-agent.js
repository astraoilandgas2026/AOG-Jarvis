export function buildSearchUrl(query=""){
  return "https://www.google.com/search?q="+encodeURIComponent(String(query).trim());
}

export function normalizeResearchLinks(links=[],limit=8){
  return links.filter(x=>x&&/^https?:$/i.test(String(x.url||"").slice(0,String(x.url||"").indexOf(":")+1))).map(x=>({text:String(x.text||x.aria||"").trim().slice(0,240),url:String(x.url),title:String(x.title||"").trim().slice(0,240)})).filter(x=>x.url).slice(0,limit);
}

export function buildResearchBundle({query,title,url,text,links=[],retrievedAt=new Date().toISOString()}={}){
  return {query:String(query||"").slice(0,1000),title:String(title||"").slice(0,240),source_url:url||null,retrieved_at:retrievedAt,evidence_level:"DOCUMENTED",content_excerpt:String(text||"").slice(0,12000),links:normalizeResearchLinks(links)};
}

export function formatResearchResult(bundle={}){
  const lines=[];
  if(bundle.title)lines.push(bundle.title);
  if(bundle.source_url)lines.push(bundle.source_url);
  if(bundle.content_excerpt)lines.push(bundle.content_excerpt.slice(0,5000));
  const links=normalizeResearchLinks(bundle.links,8);
  if(links.length){lines.push("Fuentes detectadas:");links.forEach((x,i)=>lines.push((i+1)+". "+(x.text||x.title||x.url)+" — "+x.url));}
  return lines.join("\n");
}