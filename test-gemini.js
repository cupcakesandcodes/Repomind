const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

try {
  const model = new ChatGoogleGenerativeAI({
    apiKey: "AIzaSyBxzWxFRSIKY-SEnRTdjc4xJOISEvXsiW8",
    modelName: "gemini-2.0-flash",
  });
  console.log("Success");
} catch (e) {
  console.error("Failed:", e.message);
  console.error(e.stack);
}
