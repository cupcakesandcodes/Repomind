const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

async function test() {
  try {
    const model = new GoogleGenerativeAIEmbeddings({
      apiKey: "AIzaSyBxzWxFRSIKY-SEnRTdjc4xJOISEvXsiW8",
      model: "text-embedding-004",
    });
    await model.embedQuery("hello world");
    console.log("Success with text-embedding-004");
  } catch (e) {
    console.error("text-embedding-004 failed:", e.message);
  }

  try {
    const model2 = new GoogleGenerativeAIEmbeddings({
      apiKey: "AIzaSyBxzWxFRSIKY-SEnRTdjc4xJOISEvXsiW8",
      model: "embedding-001",
    });
    await model2.embedQuery("hello world");
    console.log("Success with embedding-001");
  } catch (e) {
    console.error("embedding-001 failed:", e.message);
  }
}
test();
