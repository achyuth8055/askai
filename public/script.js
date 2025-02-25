document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");

    let eventSource = null;

    function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        displayMessage(message, "user-message");
        userInput.value = "";
        userInput.focus();

        let botMessage = displayMessage("...", "bot-message", true);
        let fullResponse = "";

        if (eventSource) {
            eventSource.close();
        }

        eventSource = new EventSource(`/stream?prompt=${encodeURIComponent(message)}`);

        eventSource.onmessage = function (event) {
            try {
                if (event.data === "[DONE]") {
                    eventSource.close();
                    eventSource = null;

                    let copyButton = document.createElement("button");
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                    copyButton.classList.add("copy-button");
                    copyButton.onclick = () => copyToClipboard(fullResponse, copyButton);

                    botMessage.appendChild(copyButton);
                } else {
                    const responseData = JSON.parse(event.data);
                    if (responseData.error) {
                        botMessage.innerText = `⚠️ ${responseData.error}`;
                    } else if (responseData.text) {
                        fullResponse += responseData.text;
                        botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");
                    }
                }
            } catch (error) {
                console.warn("⚠️ JSON Parse Error:", error);
                botMessage.innerText = "⚠️ Error processing response.";
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        };

        eventSource.onerror = function (event) {
            console.error("❌ EventSource Error:", event);
            if (eventSource) eventSource.close();
            botMessage.innerText = "⚠️ Connection lost. Try again.";
        };
    }

    sendButton.addEventListener("click", sendMessage);

    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i>';
            }, 1500);
        }).catch(err => console.error("❌ Copy Error:", err));
    }

    function displayMessage(text, className, isTemporary = false) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", className);
        messageDiv.innerHTML = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageDiv;
    }
});
