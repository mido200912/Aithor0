async function ping() {
  while(true) {
    try {
      const res = await fetch('https://aithor0.vercel.app/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.dbInitialized !== undefined) {
          console.log(JSON.stringify(data, null, 2));
          break;
        }
      }
    } catch(e) {}
    console.log("Waiting for deploy...");
    await new Promise(r => setTimeout(r, 3000));
  }
}
ping();
