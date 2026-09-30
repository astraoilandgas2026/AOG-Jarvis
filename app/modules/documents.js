const LIBS={
 docx:"https://esm.sh/docx@9.8.1",
 jspdf:"https://esm.sh/jspdf@4.2.1",
 pptx:"https://esm.sh/pptxgenjs@4.0.1"
};
function normalize(title,body){
 const text=String(body||"").trim();
 return {title:String(title||"Documento Emma"),body:text||"Documento generado por Emma."};
}
export async function generateDocument({format="pdf",title,body}={}){
 const doc=normalize(title,body);
 const f=String(format).toLowerCase();
 if(f==="pdf"){
  const {jsPDF}=await import(LIBS.jspdf); const pdf=new jsPDF();
  pdf.setFontSize(18); pdf.text(doc.title,20,22); pdf.setFontSize(11);
  const lines=pdf.splitTextToSize(doc.body,170); let y=34;
  for(const line of lines){if(y>280){pdf.addPage();y=20;} pdf.text(line,20,y);y+=6;}
  return {filename:safeName(doc.title)+".pdf",mime:"application/pdf",blob:pdf.output("blob"),preview:doc.body};
 }
 if(f==="docx"||f==="word"){
  const {Document,Packer,Paragraph,TextRun,HeadingLevel}=await import(LIBS.docx);
  const children=[new Paragraph({text:doc.title,heading:HeadingLevel.TITLE}),...doc.body.split(/\n+/).map(x=>new Paragraph({children:[new TextRun(x)]}))];
  const blob=await Packer.toBlob(new Document({sections:[{children}]}));
  return {filename:safeName(doc.title)+".docx",mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",blob,preview:doc.body};
 }
 if(f==="pptx"||f==="powerpoint"){
  const PptxGenJS=(await import(LIBS.pptx)).default; const pptx=new PptxGenJS();
  const slide=pptx.addSlide(); slide.addText(doc.title,{x:.6,y:.45,w:12,h:.6,fontSize:26,bold:true});
  const lines=doc.body.split(/\n+/); let y=1.35;
  for(const line of lines){if(y>6.8){const s=pptx.addSlide();y=.6;s.addText(doc.title,{x:.6,y:.2,w:12,h:.4,fontSize:20,bold:true});s.addText(line,{x:.8,y,w:11.5,h:.7,fontSize:18,breakLine:false});y+=.85;}else{slide.addText(line,{x:.8,y,w:11.5,h:.7,fontSize:18});y+=.85;}}
  const blob=await pptx.write({outputType:"blob"});
  return {filename:safeName(doc.title)+".pptx",mime:"application/vnd.openxmlformats-officedocument.presentationml.presentation",blob,preview:doc.body};
 }
 throw new Error("Formato no soportado: "+format);
}
function safeName(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-_]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"emma-document";}
export function renderArtifact(container,artifact){
 container.innerHTML="";
 const card=document.createElement("div");card.className="artifact-card";
 const h=document.createElement("div");h.className="artifact-head";h.innerHTML="<strong>"+escapeHtml(artifact.filename)+"</strong><span>GENERADO POR EMMA</span>";
 const pre=document.createElement("pre");pre.className="artifact-preview";pre.textContent=artifact.preview;
 const btn=document.createElement("button");btn.className="send";btn.textContent="Descargar";
 btn.onclick=()=>{const url=URL.createObjectURL(artifact.blob);const a=document.createElement("a");a.href=url;a.download=artifact.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 card.append(h,pre,btn);container.appendChild(card);
}
function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
