import json
import nltk
import numpy as np
import random
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Embedding
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

nltk.download('punkt')

# Sample dataset (Expand this with more Q&A)
data = {
    "intents": [
        {"question": "How do I improve water efficiency?",
         "answer": "Use drip irrigation and mulching to reduce water loss."},
        {"question": "What is the best crop for sandy soil?",
         "answer": "Crops like carrots and peanuts thrive in sandy soil."},
        {"question": "How can I prevent soil erosion?",
         "answer": "Use cover crops, no-till farming, and contour plowing to prevent erosion."},
        {"question": "What is the best way to store rainwater?",
         "answer": "You can store rainwater using rain barrels or underground tanks."}
    ]
}

# Tokenization
questions = [item['question'] for item in data['intents']]
answers = [item['answer'] for item in data['intents']]

tokenizer = Tokenizer()
tokenizer.fit_on_texts(questions + answers)
vocab_size = len(tokenizer.word_index) + 1

# Convert text to sequences
question_seq = tokenizer.texts_to_sequences(questions)
answer_seq = tokenizer.texts_to_sequences(answers)

# Padding
max_len = max(len(seq) for seq in question_seq + answer_seq)
question_padded = pad_sequences(question_seq, maxlen=max_len, padding="post")
answer_padded = pad_sequences(answer_seq, maxlen=max_len, padding="post")

# Convert answers to NumPy array
answer_array = np.array(answer_padded)



# Create the model
model = Sequential([
    Embedding(vocab_size, 64, input_length=max_len),
    LSTM(64, return_sequences=True),
    LSTM(64),
    Dense(64, activation="relu"),
    Dense(vocab_size, activation="softmax")
])

model.compile(loss="sparse_categorical_crossentropy", optimizer="adam", metrics=["accuracy"])

# Train the model
model.fit(question_padded, answer_array, epochs=500, verbose=1)



# Save model
model.save("chatbot_model.h5")

# Load model
from tensorflow.keras.models import load_model
model = load_model("chatbot_model.h5")


from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get("message")
   
    # Convert user input to sequence
    user_seq = tokenizer.texts_to_sequences([user_input])
    user_padded = pad_sequences(user_seq, maxlen=max_len, padding="post")

    # Predict response
    predicted_seq = model.predict(user_padded)
    predicted_index = np.argmax(predicted_seq)
   
    # Retrieve answer
    response = answers[predicted_index] if predicted_index < len(answers) else "I'm not sure, but I can learn!"
   
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(port=5000, debug=True)