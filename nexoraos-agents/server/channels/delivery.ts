import type { AgentId } from '../../shared/types.js'
import { getSupabaseClient } from '../db/client.js'

export interface WhatsAppMessage {
  from: string
  body: string
  messageId: string
  timestamp: string
}

export async function handleWhatsApp(message: WhatsAppMessage): Promise<void> {
  const { data: binding } = await getSupabaseClient()
    .from('whatsapp_bindings')
    .select('user_id')
    .eq('phone_number', message.from)
    .single()

  if (!binding) {
    await sendWhatsApp(message.from, 'Hi! To use NexoraOS agents via WhatsApp, connect your account at nexoraos.digital')
    return
  }

  const { error } = await getSupabaseClient().from('agent_tasks').insert({
    user_id: binding.user_id,
    goal: message.body,
    agent: 'nexus' as AgentId,
    status: 'queued',
    input: { goal: message.body, userId: binding.user_id, channel: 'whatsapp', channelMeta: { from: message.from } },
  })
  if (error) throw new Error(`Failed to queue WhatsApp task: ${error.message}`)
}

export async function sendWhatsApp(to: string, text: string): Promise<void> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) return
  const response = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
  if (!response.ok) throw new Error(`WhatsApp delivery failed: ${response.status}`)
}

export interface TelegramMessage {
  chatId: number
  text: string
  messageId: number
  from: { id: number; username?: string }
}

export async function handleTelegram(message: TelegramMessage): Promise<void> {
  const { data: binding } = await getSupabaseClient()
    .from('telegram_bindings')
    .select('user_id')
    .eq('telegram_id', message.from.id)
    .single()

  if (!binding) {
    await sendTelegram(message.chatId, 'Hi! To use NexoraOS agents on Telegram, connect your account at nexoraos.digital')
    return
  }

  const { error } = await getSupabaseClient().from('agent_tasks').insert({
    user_id: binding.user_id,
    goal: message.text,
    agent: 'nexus' as AgentId,
    status: 'queued',
    input: { goal: message.text, userId: binding.user_id, channel: 'telegram', channelMeta: { chatId: message.chatId } },
  })
  if (error) throw new Error(`Failed to queue Telegram task: ${error.message}`)
}

export async function sendTelegram(chatId: number, text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!response.ok) throw new Error(`Telegram delivery failed: ${response.status}`)
}

export async function replyToChannel(
  channel: 'whatsapp' | 'telegram' | 'web',
  channelMeta: Record<string, unknown>,
  response: string,
): Promise<void> {
  if (channel === 'whatsapp') {
    if (typeof channelMeta.from !== 'string') throw new Error('Missing WhatsApp recipient')
    await sendWhatsApp(channelMeta.from, response)
  } else if (channel === 'telegram') {
    if (typeof channelMeta.chatId !== 'number') throw new Error('Missing Telegram chat ID')
    await sendTelegram(channelMeta.chatId, response)
  }
}
