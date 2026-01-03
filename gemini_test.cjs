
async function listModels() {
    const apiKey = "AIzaSyBRGWqjR4VwCRnVpi8b4wZOyToszL6NM9I";
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(m.name);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e) {
        console.log("Fetch error:", e.message);
    }
}

listModels();
