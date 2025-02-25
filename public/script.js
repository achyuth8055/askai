document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    let eventSource = null;

    function displayMessage(text, className) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", className);
        messageElement.innerText = text;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        displayMessage(message, "user-message");
        userInput.value = "";
        userInput.focus();

        let botMessage = displayMessage("Thinking...", "bot-message");
        let fullResponse = "";

        try {
            eventSource = new EventSource(`/stream?prompt=${encodeURIComponent(message)}`);

            eventSource.onmessage = function (event) {
                if (event.data === "[DONE]") {
                    eventSource.close();
                    eventSource = null;
                } else {
                    try {
                        const responseData = JSON.parse(event.data);
                        if (responseData.text) {
                            fullResponse += responseData.text;
                            botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");
                        }
                    } catch (error) {
                        console.error("❌ JSON Parse Error:", error, "Data:", event.data);
                    }
                }
            };

            eventSource.onerror = function (error) {
                console.error("❌ EventSource Error:", error);
                botMessage.innerText = "Error fetching AI response.";
                eventSource.close();
                eventSource = null;
            };

        } catch (error) {
            console.error("❌ Fetch Error:", error);
            botMessage.innerText = "Error fetching AI response.";
        }
    }

    sendButton.addEventListener("click", sendMessage);

    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});
