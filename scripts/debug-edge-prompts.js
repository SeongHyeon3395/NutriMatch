const fs = require('fs');

function readEnvValue(key) {
  const envText = fs.readFileSync('.env', 'utf8');
  const m = envText.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim() : '';
}

async function main() {
  const anon = readEnvValue('SUPABASE_ANON_KEY');
  if (!anon) throw new Error('SUPABASE_ANON_KEY not found in .env');

  const url = 'https://wrgeaabfsbjdgtjcwevv.functions.supabase.co/analyze-food-image';
  const imagePath = 'assets/appicon.png';

  const fd = new FormData();
  const buf = fs.readFileSync(imagePath);
  fd.append('file', new Blob([buf], { type: 'image/png' }), 'appicon.png');

  // Send a non-empty context to trigger assistant prompt generation.
  fd.append('userContext', JSON.stringify({ bodyGoal: 'diet', healthDiet: 'low_sodium' }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: fd,
  });

  const text = await res.text();
  console.log(text);
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
