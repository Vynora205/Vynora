// Vynora V1.5 secure serverless AI endpoint for Vercel/Netlify-compatible Node runtimes.
// Set GEMINI_API_KEY in server environment variables. Never put the key in index.html.
// Optional: GEMINI_MODEL (default: gemini-2.5-flash)
export default async function handler(req,res){
  if(req.method==='GET'||req.method==='OPTIONS') return res.status(200).json({ok:true,service:'vynora-ai'});
  if(req.method!=='POST') return res.status(405).json({error:'Method Not Allowed'});
  const {action='generate',prompt,systemInstruction,text,modifyAction,context}=req.body||{};
  const key=process.env.GEMINI_API_KEY;
  if(!key) return res.status(503).json({error:'AI backend is not configured. Add GEMINI_API_KEY to the server environment.'});
  const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
  let userPrompt=prompt;
  if(action==='modify') userPrompt=`Modify the following creator text. Action: ${modifyAction}. Context: ${context}. Return ONLY the updated text.\n\nTEXT:\n${text}`;
  if(!userPrompt) return res.status(400).json({error:'Prompt is required'});
  try{
    const body={contents:[{role:'user',parts:[{text:userPrompt}]}],systemInstruction:{parts:[{text:systemInstruction||'You are Vynora V1.5, an expert creator strategist. Be specific and practical.'}]},generationConfig:{temperature:.75,maxOutputTokens:2500}};
    if(action==='generate') body.generationConfig.responseMimeType='application/json';
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||'Gemini request failed'});
    const result=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
    if(!result) return res.status(502).json({error:'AI returned an empty result'});
    return res.status(200).json({result});
  }catch(e){console.error('Vynora AI error',e);return res.status(500).json({error:'AI service failed'});}
}
