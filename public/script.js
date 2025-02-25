document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");

    // Function to Display Messages
    function displayMessage(text, className) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", className);
        messageElement.innerText = text;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    // Send Message & Handle Streaming Response
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        displayMessage(message, "user-message");
        userInput.value = "";
        userInput.focus();

        let botMessage = displayMessage("Thinking...", "bot-message");
        let fullResponse = "";

        try {
            const response = await fetch(`/stream?prompt=${encodeURIComponent(message)}`);

            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // ✅ FIX: Remove `data: ` before parsing JSON
                const lines = chunk.split("\n").filter(line => line.trim() !== "");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const jsonText = line.replace("data: ", "").trim(); // ✅ Remove `data: `
                            if (jsonText === "[DONE]") continue; // Ignore [DONE] signal

                            const parsedJson = JSON.parse(jsonText);
                            if (parsedJson.text) {
                                fullResponse += parsedJson.text;
                                botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");
                            }
                        } catch (jsonError) {
                            console.error("❌ JSON Parse Error:", jsonError, "Data received:", line);
                        }
                    }
                }
            }

            botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");

        } catch (error) {
            console.error("❌ Fetch Error:", error);
            botMessage.innerText = "Error fetching AI response.";
        }
    }

    // Event Listeners
    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});
