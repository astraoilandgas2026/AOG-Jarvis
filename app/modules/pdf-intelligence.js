const PDFJS="https://esm.sh/pdfjs-dist@5.4.149/build/pdf.mjs";
export async function extractPdfText(input){
 const bytes=input instanceof ArrayBuffer?new Uint8Array(input):new Uint8Array(await input.arrayBuffer());
 const pdfjs=await import(PDFJS);
 const pdf=await pdfjs.getDocument({data:bytes}).promise;
 const pages=[];
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i);
  const text=await page.getTextContent();
  pages.push(text.items.map(x=>String(x.str||"")).join(" ").replace(/\s+/g," ").trim());
 }
 return{pages:pdf.numPages,text:pages.join("\n\n"),characters:pages.join("").length,extracted_at:new Date().toISOString()};
}
export async function extractPdfFromUrl(url){
 const response=await fetch(url,{credentials:"omit"});
 if(!response.ok)throw new Error("PDF_FETCH_"+response.status);
 return extractPdfText(await response.arrayBuffer());
}
