# Streamlit Chatbot

This project is a simple chatbot application built using Streamlit. It provides an interactive interface for users to chat with the bot and receive responses based on their input.

## Project Structure

```
streamlit-chatbot
├── src
│   ├── main.py         # Entry point of the Streamlit application
│   └── chatbot.py      # Contains the chatbot logic
├── requirements.txt    # Lists the project dependencies
└── README.md           # Documentation for the project
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd streamlit-chatbot
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage

To run the chatbot application, execute the following command in your terminal:
```
streamlit run src/main.py
```

Once the application is running, you can interact with the chatbot through the web interface.

## Features

- User-friendly interface for chatting with the bot.
- Basic response generation based on user input.
- Easily extendable for additional features and improvements.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## Run with Docker Compose

1. Copy your `.env` file to this directory.
2. Build and start the app:
   ```sh
   docker compose up --build
   ```
3. Visit [http://localhost:8501](http://localhost:8501)