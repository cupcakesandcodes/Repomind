const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyBxzWxFRSIKY-SEnRTdjc4xJOISEvXsiW8");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBxzWxFRSIKY-SEnRTdjc4xJOISEvXsiW8`);
    const data = await response.json();
    const embedModels = data.models.filter(m => m.supportedGenerationMethods.includes("embedContent"));
    console.log("Available embedding models:");
    embedModels.forEach(m => console.log(m.name));
  } catch (e) {
    console.error("Failed:", e);
  }
}
test();
