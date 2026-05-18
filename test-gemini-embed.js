const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

try {
  const model = new GoogleGenerativeAIEmbeddings({
    apiKey: "AIzaSyBxzWxFRSIKY-SEnRTdjc4xJOISEvXsiW8",
    modelName: "text-embedding-004",
  });
  console.log("Embeddings Success");
} catch (e) {
  console.error("Failed:", e.message);
  console.error(e.stack);
}
