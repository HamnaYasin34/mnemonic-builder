# 🧠 MnemonicFlow Pro – AI Medical Mnemonics for MBBS

> **An AI-powered learning platform that helps medical students learn faster, remember longer, and revise smarter.**

---

# 📖 Overview

MnemonicFlow Pro is an AI-powered educational web application designed specifically for MBBS and healthcare students who struggle with memorising vast amounts of medical information.

Medical education demands learning thousands of facts, pathways, diseases, drugs, and anatomical structures in a limited amount of time. Traditional memorisation techniques often become overwhelming and inefficient.

MnemonicFlow Pro transforms difficult medical concepts into memorable AI-generated mnemonics, interactive flashcards, quizzes, and concise revision notes, helping students retain information more effectively through active recall and spaced repetition principles.

This project was developed as my final ACT AI application project and is also the foundation of a startup idea that I am actively building to improve medical education through artificial intelligence.

---

# 🎯 Problem Statement

Medical students spend countless hours trying to memorise complex concepts, yet retention remains a major challenge.

Most existing resources are either:

- Static
- Time-consuming
- Not personalised
- Lack AI-powered learning assistance

MnemonicFlow Pro addresses this problem by providing instant AI-generated medical mnemonics and revision tools that make studying more efficient, engaging, and memorable.

---

# 🌍 Who Is It For?

- MBBS Students
- Medical Students
- Dental Students
- Nursing Students
- Allied Health Students
- Healthcare Professionals preparing for examinations

---

# 🌐 Live Demo

## Live Application

https://mnemonic-flow.vercel.app

---

# 💻 GitHub Repository

## Public Repository

https://github.com/HamnaYasin34/mnemonic-builder

---

# ✨ Features

## 🤖 AI Mnemonic Generator

Generate memorable and medically relevant mnemonics using AI.

---

## 📚 Subject Selection

Choose from different medical subjects including:

- Anatomy
- Physiology
- Biochemistry
- Pathology
- Pharmacology
- Microbiology
- Community Medicine
- Surgery
- Medicine

---

## 🧠 Interactive Flashcards

Every generated mnemonic is displayed as an interactive revision flashcard.

Features include:

- Active recall
- Difficulty rating
- Quick review
- Copy text

---

## 📖 High-Yield Notes

Quick revision notes designed for exam preparation.

---

## 🎯 Quiz Arena

Practice medical concepts using active recall quizzes.

---

## 👤 User Authentication

Secure authentication powered by Supabase.

---

## 🌙 Modern User Interface

- Responsive Design
- Dark Theme
- Clean Dashboard
- Mobile Friendly

---

## ☁️ Cloud Deployment

Fully deployed on Vercel for public access.

---

# 🤖 AI Feature

The core feature of MnemonicFlow Pro is an AI-powered mnemonic generator.

The user simply enters a medical topic, and the AI generates:

- A memorable mnemonic
- A concise explanation
- Revision-friendly flashcards

This significantly reduces study time while improving long-term memory retention.

---

# 📝 AI Instructions / System Prompt

The AI is instructed with the following prompt:

> You are an expert medical educator specialising in helping MBBS students remember complex medical concepts. Generate medically accurate, memorable, concise, and creative mnemonics using simple language. Ensure all information is scientifically correct, examination-oriented, and easy to recall. Whenever appropriate, provide a brief explanation of the mnemonic without including unnecessary information.

---

# 🛠 Technologies Used

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

---

## Backend

- Next.js API Routes

---

## Authentication

- Supabase Authentication

---

## Database

- Supabase

---

## Artificial Intelligence

- Google Gemini API, Claude, joules

---

## Deployment

- Vercel

---

## Version Control

- GitHub

---

# 📂 Project Structure

```
app/
│
├── api/
├── auth/
├── components/
├── lib/
├── login/
├── profile/
├── globals.css
├── layout.tsx
└── page.tsx

```

---

# 📸 Screenshots

## Home Dashboard

<img width="2080" height="957" alt="image" src="https://github.com/user-attachments/assets/6ca9745b-836e-4d15-a6a2-bd4d3bd176c8" />


---

## AI Mnemonic Generation

<img width="2070" height="964" alt="image" src="https://github.com/user-attachments/assets/19d52de1-34c4-4f56-80dc-7b915f73c393" />
<img width="2048" height="933" alt="image" src="https://github.com/user-attachments/assets/31b84911-8148-49d9-aca3-00c042c98d20" />
<img width="2039" height="927" alt="image" src="https://github.com/user-attachments/assets/b61bf954-0b80-4af9-958f-6147a44a04b4" />
<img width="1958" height="927" alt="image" src="https://github.com/user-attachments/assets/1519207b-19ae-4f76-b93e-f8761ac48dc1" />






## Quiz Arena


<img width="2013" height="937" alt="image" src="https://github.com/user-attachments/assets/ad83a945-bc4b-4927-b738-4faa4f206dbe" />


## Mobile Responsive View

<img width="642" height="1389" alt="IMG_8431" src="https://github.com/user-attachments/assets/8f5282bf-1840-4a38-b031-d7f2243eb48a" />


---

# 🚀 How to Run the Project Locally

## 1. Clone the Repository

```bash
git clone https://github.com/HamnaYasin34/mnemonic-builder.git
```

---

## 2. Navigate into the Project

```bash
cd mnemonic-builder
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Configure Environment Variables

Create a file named:

```
.env.local
```

Add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

## 5. Start the Development Server

```bash
npm run dev
```

---

## 6. Open in Browser

```
http://localhost:3000
```

---

# 🚀 Future Roadmap

The current version is the MVP (Minimum Viable Product).

Future improvements include:

- Personal Vault for saved mnemonics
- Improved Anki flashcard export
- Advanced spaced repetition scheduling
- AI-generated medical diagrams
- Progress analytics dashboard
- Topic bookmarking
- Revision planner
- Collaborative study groups
- Offline study mode
- Personalized AI tutor
- Multi-device synchronisation

---

# 🌟 Startup Vision

MnemonicFlow Pro is not just a university project—it is the early prototype of a startup that I am actively developing.

The long-term vision is to create an AI-powered medical learning ecosystem that helps healthcare students worldwide study more efficiently using personalised mnemonics, intelligent revision tools, adaptive learning, and evidence-based memory techniques.

This project represents the first step toward building that vision.

---

# ⚠️ Known Issue

The application is fully deployed and the core AI-powered mnemonic generation, flashcards, quizzes, and revision features are functional.

At the time of submission, one known production issue remains with Supabase email verification. After account registration, the email verification redirect for production deployment is still being finalised. As a temporary workaround, users can verify their email and then sign in manually.

This issue does **not** affect the primary AI functionality or the overall user experience of the application's core learning features, and it is currently being addressed as part of ongoing development.

---

# 👩‍💻 Developer

**Hamna Yaseen**

MBBS Student

Dow University of Health Sciences (DUHS)

Karachi, Pakistan

---

# 📄 License

This project was developed as part of the **ACT AI Final Project**.

It is intended for educational purposes and serves as the foundation for the future development of **MnemonicFlow Pro**, an AI-powered medical education startup.

---

## ⭐ Thank You

Thank you for reviewing MnemonicFlow Pro.

I hope this project demonstrates not only my technical skills in building an end-to-end AI-powered application but also my passion for solving real-world educational challenges through technology.
