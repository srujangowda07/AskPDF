from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
from rag import RAGPipeline
from groq_client import GroqClient
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = RAGPipeline()
groq = GroqClient()

class AskRequest(BaseModel):
    question: str
    history: List[dict]

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    filename = os.path.basename(file.filename)
    temp_path = f"temp_{filename}"
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        num_pages = rag.process_pdf(temp_path)
        return {"status": "ready", "pages": num_pages, "filename": filename}
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Failed to remove temp file {temp_path}: {e}")

@app.post("/ask")
async def ask_question(request: AskRequest):
    try:
        print(f"User query: {request.question}")
        user_query = request.question.strip().lower()
        if user_query in ["summarize", "summarize it", "summary"]:
            query_to_use = "Provide a structured summary of the entire document using the given context"
        else:
            query_to_use = request.question

        chunks, refused = rag.retrieve(query_to_use)
        
        print(f"Retrieved {len(chunks)} chunks")
        
        if refused or not chunks:
            return {
                "answer": "I could not find this in the document.",
                "citations": [],
                "refused": True
            }
        
        context = ""
        for chunk in chunks:
            context += f"[Page {chunk['page']}]: {chunk['text']}\n\n"
            
        print(f"Context length: {len(context)}")
        
        if not context.strip():
            return {
                "answer": "I could not find this in the document.",
                "citations": [],
                "refused": True
            }
        
        answer = groq.ask(context, query_to_use, [])
        
        print(f"Groq response: {answer}")
        
        citations = list(set(re.findall(r"\[Page (\d+)\]", answer)))
        
        is_refused = (
            "I could not find this" in answer or 
            "outside the scope" in answer or 
            "[Page" not in answer
        )
        
        return {
            "answer": answer,
            "citations": citations,
            "refused": is_refused
        }
    except Exception as e:
        print(f"Error in /ask route: {e}")
        return {
            "answer": "I could not find this in the document.",
            "citations": [],
            "refused": True
        }

@app.post("/reset")
async def reset_index():
    rag.reset()
    return {"status": "reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
