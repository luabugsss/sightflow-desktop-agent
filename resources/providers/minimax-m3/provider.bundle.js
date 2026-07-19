/* eslint-disable @typescript-eslint/explicit-function-return-type */

const DEFAULT_MODEL = 'MiniMax-M3'
const DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1'
const DEFAULT_THINKING = 'adaptive'
const DEFAULT_PROMPT = `You are a desktop chat assistant. You will receive a screenshot of the current chat window.

Your task:
Analyze the newest message in the screenshot and generate a natural reply.

Rules:
1. Output only the reply text. Do not explain your reasoning.
2. Avoid self-looping. If the newest message was sent by the operator or by this assistant, output [SKIP].
3. If the newest content is a system message, announcement, red packet, transfer, or other non-conversation item, output [SKIP].
4. If you cannot determine whether a reply is needed, output [SKIP].
5. Keep the reply natural, concise, and human-like.`

export const manifest = {
  id: 'minimax-m3',
  apiVersion: 1
}

export function createProvider(context) {
  const providerConfig = context && context.providerConfig ? context.providerConfig : {}

  return {
    async *run(input) {
      if (!input || !input.screenshot) {
        yield { type: 'skip' }
        return
      }

      const apiKey = String(providerConfig.apiKey || '').trim()
      if (!apiKey) {
        yield { type: 'error', error: 'MiniMax provider is missing API Key' }
        return
      }

      const memorySection = buildMemorySection(input.memoryCards)
      yield {
        type: 'thinking',
        content: memorySection
          ? `MiniMax M3 is analyzing the chat (${input.memoryCards.length} memory cards loaded)...`
          : 'MiniMax is analyzing the chat...'
      }

      try {
        const reply = await requestReply({
          screenshot: input.screenshot,
          apiKey,
          baseURL: providerConfig.baseURL || DEFAULT_BASE_URL,
          model: providerConfig.model || DEFAULT_MODEL,
          thinking: providerConfig.thinking || DEFAULT_THINKING,
          systemPrompt: (providerConfig.systemPrompt || DEFAULT_PROMPT) + memorySection
        })

        if (!reply || reply.trim() === '[SKIP]') {
          yield { type: 'skip' }
          return
        }

        yield { type: 'reply_text', content: reply.trim() }
      } catch (error) {
        const message = error && error.message ? error.message : String(error)
        if (context && context.host && typeof context.host.log === 'function') {
          context.host.log(`MiniMax provider error: ${message}`)
        }
        yield { type: 'error', error: message || 'MiniMax provider request failed' }
      }
    }
  }
}

async function requestReply({ screenshot, apiKey, baseURL, model, thinking, systemPrompt }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: normalizeImageUrl(screenshot) } },
          { type: 'text', text: 'Please reply based on the newest message in the chat screenshot.' }
        ]
      }
    ],
    thinking: { type: thinking },
    reasoning_split: true,
    max_completion_tokens: 1024,
    stream: false
  }

  const response = await fetch(`${trimTrailingSlash(baseURL)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: buildAuthorizationHeader(apiKey),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const detail = await safeReadText(response)
    throw new Error(
      `MiniMax API request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}`
    )
  }

  const json = await response.json()
  const content =
    json && json.choices && json.choices[0] && json.choices[0].message
      ? json.choices[0].message.content || ''
      : ''
  return stripThinkingContent(content)
}

function buildMemorySection(memoryCards) {
  if (!Array.isArray(memoryCards) || memoryCards.length === 0) {
    return ''
  }
  const lines = memoryCards.map((card, index) => {
    const rationale = card.rationale ? ` (rationale: ${card.rationale})` : ''
    return `${index + 1}. [${card.scenario}] ${card.guidance}${rationale}`
  })
  return `\n\n## Team Memory\nFollow these reusable lessons first:\n${lines.join('\n')}`
}

function normalizeImageUrl(screenshot) {
  const value = String(screenshot || '')
  if (value.startsWith('http')) {
    return value
  }
  if (value.startsWith('data:image/')) {
    return value
  }
  return `data:image/png;base64,${stripBase64Prefix(value)}`
}

function stripBase64Prefix(base64) {
  const idx = String(base64).indexOf('base64,')
  return idx !== -1 ? String(base64).slice(idx + 'base64,'.length) : String(base64)
}

function trimTrailingSlash(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function stripThinkingContent(content) {
  return String(content || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
}

function normalizeApiKey(value) {
  return String(value || '').replace(/\s+/g, '')
}

function buildAuthorizationHeader(apiKey) {
  const value = String(apiKey || '').trim()
  const bearerMatch = value.match(/^bearer\s+(.+)$/i)
  if (bearerMatch) {
    return `Bearer ${normalizeApiKey(bearerMatch[1])}`
  }
  return `Bearer ${normalizeApiKey(value)}`
}

async function safeReadText(response) {
  try {
    const text = await response.text()
    return text.slice(0, 500)
  } catch {
    return ''
  }
}
