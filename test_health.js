async function p() {
  const r = await fetch('https://aithor0.vercel.app/');
  console.log(r.status);
  console.log(await r.text());
}
p();
