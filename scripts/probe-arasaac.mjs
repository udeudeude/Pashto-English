// External service smoke test. Uses only public one-word examples.
// No conversation transcripts, names, or personal content are sent.
const terms=['look','box','book'];
for(const word of terms){
 const url='https://api.arasaac.org/v1/pictograms/en/search/'+word;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url,{signal:controller.signal});
  const text=await response.text();
  if(!response.ok)throw Error('HTTP '+response.status+' '+text.slice(0,100));
  const data=JSON.parse(text);
  if(!Array.isArray(data))throw Error('Not an array');
  console.log(JSON.stringify({
    word,status:response.status,count:data.length,
    first:data[0]?{id:data[0]._id,keys:Object.keys(data[0]),keywords:data[0].keywords?.slice(0,3)}:null,
    cors:response.headers.get('access-control-allow-origin')
  }));
  if(!data.some(item=>Number.isInteger(item._id)))throw Error('No valid numeric pictogram identifiers for '+word);
 }finally{clearTimeout(timer)}
}
