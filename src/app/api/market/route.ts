export const runtime="nodejs";
export async function GET(){
  const source="https://api.worldbank.org/v2/country/CIV/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=20";
  try{const r=await fetch(source,{signal:AbortSignal.timeout(10000),next:{revalidate:86400}});if(!r.ok)throw new Error();const j=await r.json();const values=(j[1]??[]).filter((d:{value:unknown})=>typeof d.value==="number").slice(0,8).map((d:{date:string;value:number})=>({year:d.date,value:d.value})).reverse();if(!values.length)throw new Error();return Response.json({available:true,title:"Croissance du PIB réel de Côte d’Ivoire",unit:"% annuel",indicator:"NY.GDP.MKTP.KD.ZG",source,values,retrievedAt:new Date().toISOString()});}catch{return Response.json({available:false,source,message:"Indicateur Banque mondiale momentanément indisponible."});}
}
