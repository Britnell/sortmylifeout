import { env } from 'cloudflare:workers'
import { createEvent, searchEvents, updateEvent } from '@/serverFn/date.server'
import { jevPayload } from './prompt'
import { dateCandidates } from './dates'

export { dateCandidates }
import type {
  Args,
  EventRow,
  Messages,
  ToolCallMessage,
  ToolResultMessage,
} from './types'

export const jev = ({
  state,
  questions,
}: {
  state: object
  questions: object
}): Promise<JevResult | string> =>
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

export type UpdateEventsType = Answer<'event' | 'todo' | 'shopping'>
export type UpdateEventsCompleted = Answer<'true' | 'false'>

export type Answers = {
  create_events_type: CreateEventsType
  create_events_title: Answer<string>
  create_events_detail: Answer<string>
  create_events_begin: SearchEventsDate
  create_events_end: SearchEventsDate
  create_events_completed: CreateEventsCompleted
  update_events_id: Answer<string>
  update_events_type: UpdateEventsType
  update_events_title: Answer<string>
  update_events_detail: Answer<string>
  update_events_begin: SearchEventsDate
  update_events_end: SearchEventsDate
  update_events_completed: UpdateEventsCompleted
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
    const filters = searchFilters(answers)
    console.log('search_events', filters)
    const rows = await searchEvents(userId, filters)
    return toolMessages('search_events', filters, rows)
  }

  if (answers.tool_choice.choice === 'create') {
    const args = createArgs(answers)
    const { id } = await createEvent(userId, {
      ...args,
      allDay: !args.begin || !String(args.begin).includes('T'),
    } as Parameters<typeof createEvent>[1])
    return toolMessages('create_event', args, [
      { id, ...args },
    ] as unknown as EventRow[])
  }

  if (answers.tool_choice.choice === 'update') {
    const { id, ...args } = updateArgs(answers)
    await updateEvent(userId, id, args as Parameters<typeof updateEvent>[2])
    return toolMessages('update_event', args, [
      { id, ...args },
    ] as unknown as EventRow[])
  }

  // TODO: none branch
  return []
}

const toolMessages = (
  tool: ToolCallMessage['tool'],
  args: Args,
  result: EventRow[],
): Messages => {
  const call: ToolCallMessage = {
    id: makeToolId(),
    role: 'tool_call',
    tool,
    args,
  }
  const toolResult: ToolResultMessage = {
    id: makeToolId(),
    role: 'tool_result',
    toolCallId: call.id,
    result,
  }
  return [call, toolResult]
}

const createArgs = (answers: Answers): Args =>
  Object.fromEntries(
    Object.entries({
      type: answers.create_events_type.choice,
      title: answers.create_events_title.choice,
      detail: answers.create_events_detail.choice,
      begin: answers.create_events_begin.choice,
      end: answers.create_events_end.choice,
      completed:
        answers.create_events_completed.choice === 'none'
          ? undefined
          : answers.create_events_completed.choice === 'true',
    }).filter(([, v]) => v !== undefined && v !== 'none'),
  )

const updateArgs = (answers: Answers) => {
  // all fields optional: 'none' means keep the existing value - only include changed fields
  const { id, ...rest } = Object.fromEntries(
    Object.entries({
      id: answers.update_events_id.choice,
      type: answers.update_events_type.choice,
      title: answers.update_events_title.choice,
      detail: answers.update_events_detail.choice,
      begin: answers.update_events_begin.choice,
      end: answers.update_events_end.choice,
      completed:
        answers.update_events_completed.choice === 'none'
          ? undefined
          : answers.update_events_completed.choice === 'true',
    }).filter(([, v]) => v !== undefined && v !== 'none'),
  ) as { id: number } & Args
  return { id: id as number, ...rest }
}

const searchFilters = (answers: Answers): Args =>
  Object.fromEntries(
    Object.entries({
      type: answers.search_events_type.choice,
      completed:
        answers.search_events_completed.choice === 'none'
          ? undefined
          : answers.search_events_completed.choice === 'true',
      date_from: answers.search_events_date_from.choice,
      date_to: answers.search_events_date_to.choice,
    }).filter(([, v]) => v !== undefined && v !== 'none'),
  )
