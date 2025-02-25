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

    // Send Message & Enter Key Support
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        displayMessage(message, "user-message");
        userInput.value = "";
        userInput.focus();

        let botMessage = displayMessage("Thinking...", "bot-message");
        let fullResponse = "";

        fetch(`/stream?prompt=${encodeURIComponent(message)}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || "Server error");
                    });
                }
                return response;
            })
            .then(response => {
                eventSource = new EventSource(`/stream?prompt=${encodeURIComponent(message)}`);

                eventSource.onmessage = function (event) {
                    if (event.data === "[DONE]") {
                        eventSource.close();
                        eventSource = null;

                        let copyButton = document.createElement("button");
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        copyButton.classList.add("copy-button");
                        copyButton.onclick = () => copyToClipboard(fullResponse, copyButton);

                        botMessage.appendChild(copyButton);
                    } else if (event.data === "[ERROR]") {
                        botMessage.innerText = "Error fetching AI response.";
                        eventSource.close();
                        eventSource = null;
                    } else {
                        try {
                            const responseData = JSON.parse(event.data);
                            fullResponse += responseData.text;
                            botMessage.innerHTML = fullResponse.replace(/\n/g, "<br>");
                        } catch (error) {
                            console.error("Error processing response:", error);
                            botMessage.innerText = "Error processing response.";
                        }
                    }
                    chatBox.scrollTop = chatBox.scrollHeight;
                };

                eventSource.onerror = function (error) {
                    console.error("EventSource error:", error);
                    botMessage.innerText = "Error fetching AI response.";
                    eventSource.close();
                    eventSource = null;
                };
            })
            .catch(error => {
                console.error("Fetch error:", error);
                botMessage.innerText = error.message;
            });
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