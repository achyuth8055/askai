document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const sidebar = document.getElementById("sidebar");
    const closeSidebar = document.getElementById("close-sidebar");
    let eventSource = null;

    // Sidebar Toggle Functionality
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("show");
    });

    closeSidebar.addEventListener("click", () => {
        sidebar.classList.remove("show");
    });

    // Function to Copy AI Response
    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i>';
            }, 1500);
        }).catch(err => console.error("Failed to copy text:", err));
    }

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

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = value.trim().split("\n").filter(line => line.trim() !== "");

                for (const line of lines) {
                    try {
                        const parsedJson = JSON.parse(line);
                        if (parsedJson.text) {
                            fullResponse += parsedJson.text;
                            botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");
                        }
                    } catch (jsonError) {
                        console.error("❌ JSON Parse Error:", jsonError, "Data received:", line);
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
