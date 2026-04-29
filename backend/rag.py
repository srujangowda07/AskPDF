import fitz  # PyMuPDF
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import re
import logging
import os

# Suppress verbose warnings from transformers
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
os.environ["TOKENIZERS_PARALLELISM"] = "false"
class RAGPipeline:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = None
        self.chunks = []
        self.embedding_dim = 384 # Dim for all-MiniLM-L6-v2

    def process_pdf(self, file_path):
        doc = fitz.open(file_path)
        self.chunks = []
        all_embeddings = []
        
        print(f"--- Processing PDF: {file_path} ---")

        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            print(f"Page {page_num+1} text length: {len(text)}")
            
            # Simple chunking: 200 words (approx tokens) with 40 word overlap
            words = text.split()
            if not words:
                continue
                
            chunk_size = 200
            overlap = 40
            
            for i in range(0, len(words), chunk_size - overlap):
                chunk_text = " ".join(words[i : i + chunk_size])
                if len(chunk_text.strip()) < 20: # Skip if too small
                    continue
                
                self.chunks.append({
                    "page": page_num + 1,
                    "text": chunk_text
                })
                
                # Generate embedding
                embedding = self.model.encode(chunk_text, normalize_embeddings=True)
                all_embeddings.append(embedding)

        num_pages = len(doc)
        doc.close() # Explicitly close on Windows

        if all_embeddings:
            all_embeddings = np.array(all_embeddings).astype('float32')
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.index.add(all_embeddings)
            print(f"Successfully indexed {len(all_embeddings)} chunks.")
        else:
            print("WARNING: No text chunks extracted from PDF!")
            
        print(f"Processed {num_pages} pages. Created {len(self.chunks)} chunks.")
        return num_pages

    def retrieve(self, query, top_k=8):
        if self.index is None or not self.chunks:
            return [], True

        query_embedding = self.model.encode([query], normalize_embeddings=True).astype('float32')
        distances, indices = self.index.search(query_embedding, top_k)

        print(f"Retrieved distances: {distances[0]}")

        results = []
        for i in range(len(indices[0])):
            idx = indices[0][i]
            if idx != -1 and idx < len(self.chunks):
                results.append(self.chunks[idx])
        
        print(f"Number of chunks retrieved: {len(results)}")
        
        if not results:
            return [], True
        
        return results, False
    def reset(self):
        self.index = None
        self.chunks = []
