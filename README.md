# Exam Prep Chat

A Next.js chatbot that uses OpenAI to answer questions about your study materials. Upload lecture slides, tutorial notes, or PDFs, then ask questions or request summaries for exam prep.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Add your OpenAI API key** – create a `.env.local` file in the project root:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```
   Get your key from [OpenAI Platform](https://platform.openai.com/api-keys).

3. **Run the dev server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Features

- **Chat with AI** – Ask questions and get answers powered by GPT-4o-mini
- **Upload documents** – PDF, PowerPoint (.pptx), Word (.docx), or plain text (.txt)
- **Context-aware answers** – The AI uses your uploaded material to answer questions
- **Study summaries** – Request key points, exam-style summaries, and study guides

## Usage

1. Click **Upload notes** and select your lecture slides, tutorial notes, or PDFs
2. Ask questions about the material or use quick prompts like:
   - "Summarise the key points for this material"
   - "What are the main concepts I should know for the exam?"
   - "Create a study guide from this content"
3. Click **Clear** to remove uploaded documents and start fresh
