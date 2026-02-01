const { GoogleGenAI } = require("@google/genai");

try {
    const ai = new GoogleGenAI({ project: "test", location: "global" });

    if (ai.chats) {
        console.log("ai.chats type:", typeof ai.chats);
        console.log("ai.chats prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(ai.chats)));

        if (ai.chats.create) {
            console.log("ai.chats.create exists");
        } else {
            console.log("ai.chats.create MISSING");
        }
    } else {
        console.log("ai.chats is undefined");
    }

} catch (e) {
    console.error("Error initializing SDK:", e);
}
