import time

import streamlit as st

from chatbot import llm_call

st.set_page_config(page_title="LiteLLM Chatbot 🤖", page_icon="💬")
st.title("LiteLLM Chatbot 🤖")

# --- Conversation Management ---
if "conversations" not in st.session_state:
    st.session_state.conversations = [
        [{"role": "system", "content": "You are a helpful assistant."}]
    ]
if "selected_chat" not in st.session_state:
    st.session_state.selected_chat = 0
if "chat_titles" not in st.session_state:
    st.session_state.chat_titles = [""]  # Empty title for each chat

# Sidebar: Chat selection and new chat button
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
    st.subheader("🗨️ Conversations")
    # Show "New Chat" for empty titles, or the title if set
    chat_titles = [
        title if title else "New Chat" for title in st.session_state.chat_titles
    ]
    selected = st.radio(
        "Select a conversation", chat_titles, index=st.session_state.selected_chat
    )
    if st.button("➕ New Chat"):
        st.session_state.conversations.append(
            [{"role": "system", "content": "You are a helpful assistant."}]
        )
        st.session_state.chat_titles.append("")
        st.session_state.selected_chat = len(st.session_state.conversations) - 1
        st.stop()
    st.session_state.selected_chat = chat_titles.index(selected)
    st.markdown("---")
    st.subheader("🗨️ Chat History")
    messages = st.session_state.conversations[st.session_state.selected_chat]
    for msg in messages[1:]:
        role = "🧑‍💻 You" if msg["role"] == "user" else "🤖 Assistant"
        st.markdown(f"**{role}:** {msg['content']}")

# --- Main Chat Area ---
messages = st.session_state.conversations[st.session_state.selected_chat]
user_input = st.chat_input("Type your message here...")

if user_input:
    messages.append({"role": "user", "content": user_input})

    # Show all previous messages
    for msg in messages[1:]:
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
    messages.append({"role": "assistant", "content": reply})

    # --- Generate a title for the chat if it's still empty ---
    chat_idx = st.session_state.selected_chat
    if st.session_state.chat_titles[chat_idx] == "":
        # Use the user's first message to generate a title
        title_prompt = (
            "Generate a short, descriptive title (max 5 words) for this conversation:\n"
            f"User: {user_input}\nAssistant: {reply}\nTitle:"
        )
        title = llm_call(title_prompt, user_input)
        # Clean up the title (optional: take only the first line)
        st.session_state.chat_titles[chat_idx] = title.strip().split("\n")[0]

else:
    # On initial load or after response, show full conversation
    for msg in messages[1:]:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
