const { GoogleGenAI } = require("@google/genai");

console.log("SDK Version Check:");
try {
    const ai = new GoogleGenAI({ project: "test", location: "global" });
    console.log("ai instance keys:", Object.keys(ai));

    if (ai.chats) {
        console.log("ai.chats keys:", Object.keys(ai.chats));
    } else {
        console.log("ai.chats is undefined");
    }

    if (ai.models) {
        console.log("ai.models keys:", Object.keys(ai.models));
        // check prototype of models
        console.log("ai.models prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(ai.models)));
    } else {
        console.log("ai.models is undefined");
    }

} catch (e) {
    console.error("Error initializing SDK:", e);
}
