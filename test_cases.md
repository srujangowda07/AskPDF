# Test Cases - PDF Chat Agent

## Sample Document

Attention Is All You Need (Transformer Paper)

---

## Valid Queries (Should Return Answer + Citations)

### 1. Query

What is the main contribution of the Transformer model?

**Expected Behavior:**

* Explains that Transformer replaces RNNs/CNNs with attention-only architecture
* Mentions improved parallelization and performance
* Includes citation [Page 1]

---

### 2. Query

Why are recurrent models limited according to the paper?

**Expected Behavior:**

* Mentions sequential computation and lack of parallelization
* Includes citation [Page 2]

---

### 3. Query

What is self-attention and why is it important?

**Expected Behavior:**

* Explains self-attention relates different positions in a sequence
* Mentions its use in modeling dependencies
* Includes citation [Page 2]

---

### 4. Query

Explain scaled dot-product attention.

**Expected Behavior:**

* Mentions Q, K, V and softmax(QKᵀ / √dk)V
* Includes citation [Page 4]

---

### 5. Query

What are the main components of the Transformer architecture?

**Expected Behavior:**

* Mentions encoder, decoder, multi-head attention, feed-forward layers
* Includes citation [Page 3]

---

## Invalid / Out-of-Scope Queries (Should REFUSE)

### 1. Query

Who is Elon Musk?

**Expected Behavior:**

* System refuses:
  "I could not find this in the document."
* No hallucination

---

### 2. Query

What is the latest AI news in 2025?

**Expected Behavior:**

* Refusal response
* No external knowledge used

---

### 3. Query

Explain how GPT-5 works.

**Expected Behavior:**

* Refusal (not in document)
* No invented answer

---

## Expected System Behavior Summary

| Case             | Expected Result             |
| ---------------- | --------------------------- |
| Valid queries    | Answer + [Page X] citations |
| Invalid queries  | Refusal                     |
| No context found | Refusal                     |
| All responses    | Strictly grounded in PDF    |

---

## Additional Checks

* All answers must include citations (e.g., [Page 2])
* No hallucinated content
* Same query -> consistent answer
* Summarization queries should work correctly
