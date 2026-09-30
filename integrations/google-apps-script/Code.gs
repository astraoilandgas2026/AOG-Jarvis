function doGet(e){return handle_(e,"GET");}
function doPost(e){return handle_(e,"POST");}
function handle_(e,method){
  const body=method==="POST"?JSON.parse(e?.postData?.contents||"{}"):(e?.parameter||{});
  const action=String(body.action||"status");
  if(action==="status")return out_({ok:true,provider:"google-apps-script",account:Session.getEffectiveUser().getEmail(),gmail:true,calendar:true});
  if(action==="gmail.list"){
    const q=String(body.query||"in:inbox"),max=Math.min(Math.max(Number(body.max)||10,1),25);
    const threads=GmailApp.search(q,0,max),data=[];
    threads.forEach(t=>t.getMessages().forEach(m=>data.push({id:m.getId(),threadId:t.getId(),date:m.getDate().toISOString(),from:m.getFrom(),to:m.getTo(),subject:m.getSubject(),snippet:m.getPlainBody().slice(0,500),unread:m.isUnread()})));
    data.sort((a,b)=>new Date(b.date)-new Date(a.date));
    return out_({ok:true,count:data.length,data:data.slice(0,max)});
  }
  if(action==="gmail.send"){
    const to=String(body.to||"").trim(),subject=String(body.subject||"").trim(),text=String(body.text||"");
    if(!to||!subject||!text)return out_({ok:false,error:"to, subject y text son obligatorios"});
    GmailApp.sendEmail(to,subject,text,body.html?{htmlBody:String(body.html)}:{});
    return out_({ok:true,sent:true,to,subject});
  }
  if(action==="calendar.list"){
    const start=new Date(body.start||Date.now()),end=new Date(body.end||Date.now()+7*86400000);
    const data=CalendarApp.getDefaultCalendar().getEvents(start,end).map(e=>({id:e.getId(),title:e.getTitle(),start:e.getStartTime().toISOString(),end:e.getEndTime().toISOString(),location:e.getLocation(),description:e.getDescription(),guests:e.getGuestList().map(g=>g.getEmail())}));
    return out_({ok:true,count:data.length,data});
  }
  if(action==="calendar.create"){
    const title=String(body.title||"").trim(),start=new Date(body.start),end=new Date(body.end);
    if(!title||isNaN(start)||isNaN(end))return out_({ok:false,error:"title, start y end son obligatorios"});
    const e=CalendarApp.getDefaultCalendar().createEvent(title,start,end,{location:body.location?String(body.location):undefined,description:body.description?String(body.description):undefined,guests:body.guests?String(body.guests):undefined,sendInvites:true});
    return out_({ok:true,created:true,id:e.getId(),title:e.getTitle(),start:e.getStartTime().toISOString(),end:e.getEndTime().toISOString()});
  }
  return out_({ok:false,error:"Acción no disponible"});
}
function out_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);}