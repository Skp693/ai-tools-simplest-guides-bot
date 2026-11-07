import { Client } from '@atproto/lex'
import { PasswordSession } from '@atproto/lex-password-session'
import * as dotenv from 'dotenv'
import { CronJob } from 'cron'
import * as process from 'process'
import * as fs from 'fs'
import { generateText } from 'ai'
import * as app from './lexicons/app.js'

dotenv.config()

// ====================== VERIFIED TOOLS LIST ======================
const TOOLS = [
  { name: "ChatGPT", website: "https://chatgpt.com" },
  { name: "Claude", website: "https://claude.ai" },
  { name: "Perplexity", website: "https://www.perplexity.ai" },
  { name: "Gamma", website: "https://gamma.app" },
  { name: "Canva Magic Studio", website: "https://www.canva.com" },
  { name: "Remove.bg", website: "https://www.remove.bg" },
  { name: "Photopea", website: "https://www.photopea.com" },
  { name: "Microsoft Copilot", website: "https://copilot.microsoft.com" },
  { name: "Google Gemini", website: "https://gemini.google.com" },
  { name: "Ideogram", website: "https://ideogram.ai" },
  { name: "CapCut", website: "https://www.capcut.com" },
  { name: "Notion AI", website: "https://www.notion.so" },
  { name: "HuggingChat", website: "https://huggingface.co/chat" },
  { name: "Poe", website: "https://poe.com" },
  { name: "Leonardo AI", website: "https://leonardo.ai" }
]

const STATE_FILE = './used-tools.json'

function getNextTool() {
  let used: string[] = []
  if (fs.existsSync(STATE_FILE)) {
    used = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  }
  if (used.length >= TOOLS.length) used = []

  const available = TOOLS.filter(t => !used.includes(t.name))
  const selected = available[Math.floor(Math.random() * available.length)]

  used.push(selected.name)
  fs.writeFileSync(STATE_FILE, JSON.stringify(used, null, 2))
  return selected
}

// ====================== GENERATE CLEAN GUIDE ======================
async function generateGuide(tool: { name: string; website: string }) {
  const { text } = await generateText({
    model: 'anthropic/claude-sonnet-4-5',
    system: `You write for the blog "AI TOOLS - Simplest Step By Step Guides".

Write in the simplest everyday English possible. Zero technical jargon.

Follow this exact structure:

CATCHY HEADLINE
(then a blank line)

HOOK
2-3 short sentences that speak to a real daily problem people face.

TOPICS COVERED
1. ...
2. ...
3. ...
4. ...
5. ...

OVERVIEW
3-4 simple sentences explaining what the tool does and who it helps.

STEP-BY-STEP GUIDE
1. ...
2. ...
3. ...
(keep each step short and clear)

3 REAL-LIFE USE CASES
Use Case 1: ...
Use Case 2: ...
Use Case 3: ...

DOS AND DON'TS
Dos:
- ...
- ...
Don'ts:
- ...
- ...

Rules:
- Only accurate, currently true information
- Mention the official website once
- Keep language warm, helpful and extremely simple
- Never invent features`,
    prompt: `Write a complete guide for: ${tool.name}\nOfficial website: ${tool.website}`
  })

  return text
}

// ====================== SMART SPLITTER (max ~280 chars) ======================
function splitIntoThread(text: string): string[] {
  const max = 280
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= max) {
      current = current ? current + '\n\n' + para : para
    } else {
      if (current) chunks.push(current)
      if (para.length > max) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para]
        let temp = ''
        for (const s of sentences) {
          if ((temp + ' ' + s).trim().length <= max) {
            temp = (temp + ' ' + s).trim()
          } else {
            if (temp) chunks.push(temp)
            temp = s.trim()
          }
        }
        if (temp) current = temp
        else current = ''
      } else {
        current = para
      }
    }
  }
  if (current) chunks.push(current)

  return chunks.map((chunk, i) => {
    if (chunks.length === 1) return chunk
    return `${i + 1}/${chunks.length}\n\n${chunk}`
  })
}

// ====================== POST AS PROPER THREAD ======================
async function publishThread(session: PasswordSession, fullText: string) {
  const client = new Client(session)
  const parts = splitIntoThread(fullText)

  console.log(`Posting thread with ${parts.length} parts...`)

  const root = await client.create(app.bsky.feed.post, {
    text: parts[0],
    createdAt: new Date().toISOString(),
  })

  let parent = root

  for (let i = 1; i < parts.length; i++) {
    await new Promise(r => setTimeout(r, 1500))

    const reply = await client.create(app.bsky.feed.post, {
      text: parts[i],
      createdAt: new Date().toISOString(),
      reply: {
        root: { uri: root.uri, cid: root.cid },
        parent: { uri: parent.uri, cid: parent.cid },
      },
    })
    parent = reply
  }

  console.log('Full thread published successfully!')
  console.log('Root URI:', root.uri)
}

// ====================== MAIN AGENT ======================
async function runAgent() {
  console.log('Agent starting...')
  const tool = getNextTool()
  console.log(`Selected tool → ${tool.name}`)

  const guide = await generateGuide(tool)
  console.log('Guide generated')

  const session = await PasswordSession.create({
    service: process.env.BOT_PDS!,
    identifier: process.env.BOT_HANDLE!,
    password: process.env.BOT_PASSWORD!,
  })

  await publishThread(session, guide)
}

async function main() {
  // Run once immediately (useful for first deploy / testing)
  await runAgent()

  // Then schedule for 11:00 and 21:00 every day (server time is UTC)
  const job = new CronJob('0 11,21 * * *', () => {
    runAgent().catch(console.error)
  })

  job.start()
  console.log('Agent is live and on autopilot (11 AM & 9 PM daily)')
}

main().catch(console.error)
