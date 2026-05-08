async function testApi() {
    try {
        const response = await fetch("http://localhost:3000/api/ai/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: "Hello" })
        });
        const data = await response.json();
        console.log("Response:", data);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
testApi();
