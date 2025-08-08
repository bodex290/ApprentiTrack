import time

import streamlit as st

from chatbot import llm_call

st.set_page_config(page_title="LiteLLM Chatbot 🤖", page_icon="💬")
st.title("LiteLLM Chatbot 🤖")

# Sidebar: instructions and chat history
with st.sidebar:
    st.header("💡 How to use")
    st.markdown(
        """
        - Type your message and press **Send** or hit **Enter**.
        - The assistant will reply in the chat window.
        - Your conversation history is preserved during this session.
        """
    )
    st.markdown("---")
    st.write("Powered by Azure OpenAI & Streamlit")
    st.markdown("---")
    st.subheader("🗨️ Chat History")
    if "messages" in st.session_state:
        for msg in st.session_state.messages[1:]:
            role = "🧑‍💻 You" if msg["role"] == "user" else "🤖 Assistant"
            st.markdown(f"**{role}:** {msg['content']}")

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]

user_input = st.chat_input("Type your message here...")

# If user sends a message, append it and get assistant reply
if user_input:
    st.session_state.messages.append({"role": "user", "content": user_input})

    # Show all previous messages
    for msg in st.session_state.messages[1:]:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Show progress bar for assistant "thinking"
    with st.chat_message("assistant"):
        progress_bar = st.progress(0, text="🤔 Thinking...")
        for percent in range(1, 81, 8):
            time.sleep(0.05)
            progress_bar.progress(percent, text="🤔 Thinking...")
        progress_bar.progress(90, text="✨ Finalizing response...")
        reply = llm_call(st.session_state.messages)
        progress_bar.progress(100, text="✅ Done!")
        time.sleep(0.3)
        progress_bar.empty()
        st.markdown(reply)
    st.session_state.messages.append({"role": "assistant", "content": reply})

else:
    # On initial load or after response, show full conversation
    for msg in st.session_state.messages[1:]:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
