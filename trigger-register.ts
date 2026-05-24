async function main() {
  const payload = {
    name: "Test User",
    email: `test-${Date.now()}@vibelab.io`,
    password: "Password123!",
    role: "student"
  };

  const url = 'https://ais-dev-36lnhp4tfidj7o7xejmsjr-207419803363.asia-southeast1.run.app/api/auth/register';
  console.log("Sending POST to live dev URL:", url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log("STATUS CODE:", res.status);
    const text = await res.text();
    console.log("RESPONSE TEXT INITIAL CHUNK:");
    console.log(text.substring(0, 500));
  } catch (error: any) {
    console.error("Fetch request failed:", error.message);
  }
}

main();
