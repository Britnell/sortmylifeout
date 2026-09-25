import { env } from 'cloudflare:workers'
import { searchEvents } from '@/serverFn/date.server'
import { dateCandidates, jevPayload } from './prompt'

export { dateCandidates }
import type { Messages, ToolMessage } from './types'

export const jev = ({
  state,
  questions,
}: {
  state: object
  questions: object
}): Promise<JevResult|string> =>
  fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jev-latest',
      state,
      questions,
    }),
  }).then((res) => (res.ok ? res.json() : res.text()))

const makeToolId = () => `tool-${crypto.randomUUID()}`

export type Answer<K extends string = string> = {
  type: 'choice'
  choice: K | 'none'
  confidence: number
  probabilities: Record<string, number>
}

export type ToolChoice = Answer<'create' | 'search' | 'update'>
export type SearchEventsType = Answer<'event' | 'todo' | 'shopping'>
export type SearchEventsCompleted = Answer<'true' | 'false'>
export type SearchEventsDate = Answer<string> // 'YYYY-MM-DD'

export type CreateEventsType = Answer<'event' | 'todo' | 'shopping'>
export type CreateEventsCompleted = Answer<'true' | 'false'>

export type Answers = {
  create_events_type: CreateEventsType
  create_events_title: Answer<string>
  create_events_detail: Answer<string>
  create_events_begin: SearchEventsDate
  create_events_end: SearchEventsDate
  create_events_completed: CreateEventsCompleted
  tool_choice: ToolChoice
  search_events_type: SearchEventsType
  search_events_completed: SearchEventsCompleted
  search_events_date_from: SearchEventsDate
  search_events_date_to: SearchEventsDate
}

export type JevResult = { answers: Answers }

export const decisionModel = async (
  messages: Messages,
  userId: string,
): Promise<Messages> => {
  const res = await jev(jevPayload(messages))
  if (typeof res === 'string') throw new Error(`jev failed: ${res}`)
  const { answers } = res

  console.log('tool choice : ', answers.tool_choice.choice)

  if (answers.tool_choice.choice === 'search') {
    const rows = await searchTool(userId, answers)
    const tool: ToolMessage = {
      id: makeToolId(),
      role: 'tool',
      tool: 'search_events',
      result: rows,
    }
    console.log(tool)
    return [tool]
  }

  if (answers.tool_choice.choice === 'create') {
    // TODO: title - create_events_title is blank for now, insert blocked until solved
    const item = {
      type: answers.create_events_type.choice,
      title: '', // TODO: figure out best way to handle title
      detail:
        answers.create_events_detail.choice === 'none'
          ? undefined
          : answers.create_events_detail.choice,
      begin:
        answers.create_events_begin.choice === 'none'
          ? undefined
          : answers.create_events_begin.choice,
      end:
        answers.create_events_end.choice === 'none'
          ? undefined
          : answers.create_events_end.choice,
      completed: answers.create_events_completed.choice === 'true',
    }
    console.log('create_event', item)

    // const rows = await createEvent(userId, {
    //   ...item,
    //   allDay: !item.begin || !item.begin.includes('T'),
    // })
    const tool: ToolMessage = {
      id: makeToolId(),
      role: 'tool',
      tool: 'create_event',
      result: [item] as unknown as ToolMessage['result'],
    }
    return [tool]
  }

  // TODO: update / none branches
  return []
}

const searchTool = (userId: string, answers: Answers) => {
  const completed =
    answers.search_events_completed.choice === 'none'
      ? undefined
      : answers.search_events_completed.choice === 'true'

  const choices = {
    type: answers.search_events_type.choice,
    completed,
    date_from: answers.search_events_date_from.choice,
    date_to: answers.search_events_date_to.choice,
  }

  console.log(choices)
  const filters = Object.fromEntries(
    Object.entries(choices).filter(([, v]) => v !== undefined && v !== 'none'),
  )

  return searchEvents(userId, filters)
}
