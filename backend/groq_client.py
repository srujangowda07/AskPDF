import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class GroqClient:
    def __init__(self):
        self.client = Groq()

    def ask(self, context, question, history=[]):
        try:
            if not context.strip():
                return "I could not find this in the document."

            prompt = f"""
You are a strict document-grounded assistant.

* Answer ONLY using the context
* Do NOT use external knowledge
* If not found, say:
  'I could not find this in the document.'
* Always include citations [Page X]
* Provide clean structured answers

Provide a clear, structured answer in paragraphs. Do not repeat information.

Answer Format:
Answer:
<main answer>

Sources:
[Page X], [Page Y]

Context:
{context}

Question:
{question}

Answer:
"""

            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",  
                messages=[
                    {"role": "system", "content": "Answer only from document."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )

            return response.choices[0].message.content

        except Exception as e:
            print("Groq Error:", str(e))
            return "I could not find this in the document."
