document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    let eventSource = null;

    function displayMessage(text, className, appendCopy = false) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", className);
        messageElement.innerHTML = text;

        if (appendCopy) {
            const copyButton = document.createElement("button");
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.classList.add("copy-button");
            copyButton.onclick = () => copyToClipboard(text, copyButton);
            messageElement.appendChild(copyButton);
        }

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i>';
            }, 1500);
        }).catch(err => console.error("Failed to copy text:", err));
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

                    botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");
                    displayMessage(fullResponse, "bot-message", true); // Add Copy Button

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
