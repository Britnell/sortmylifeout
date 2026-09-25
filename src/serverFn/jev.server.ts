import { env } from 'cloudflare:workers'
import * as chrono from 'chrono-node'
import { searchEvents } from '@/serverFn/date.server'
import type { Messages, ToolMessage } from './types'

// chrono (en.GB) handles words + slashes but not "2.8." / "5-11" - catch
// those with a regex (day.month / day-month, EU order) and build candidates directly
const weekday = (d: Date) =>
  [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][d.getUTCDay()]

const candidate = (d: Date) => {
  const date = d.toISOString().slice(0, 10)
  return { key: date, value: `${weekday(d)} ${date}` }
}

const euDateCandidates = (message: string) =>
  [
    ...message.matchAll(/\b(\d{1,2})[.-](\d{1,2})(?:[.-](\d{2,4}))?\b/g),
  ].flatMap((m): { key: string; value: string }[] => {
    const day = +m[1]
    const month = +m[2]
    if (day < 1 || day > 31 || month < 1 || month > 12) return []
    const year = m[3]
      ? +(m[3].length === 2 ? 2000 + +m[3] : m[3])
      : new Date().getUTCFullYear()
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCDate() !== day || d.getUTCMonth() !== month - 1) return []
    return [candidate(d)]
  })

export const dateCandidates = (message: string) =>
  Object.fromEntries(
    [
      ...chrono.en.GB.parse(message).map((r) => candidate(r.start.date())),
      ...euDateCandidates(message),
    ].map((d) => [d.key, d.value]),
  )

export const jev = ({
  state,
  questions,
}: {
  state: object
  questions: object
}) =>
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

const searchChoices = (prompt: string) => ({
  search_events_type: {
    type: 'choice',
    instructions:
      'search tool param: which item type does the user want to find?',
    criteria: {
      event: 'a classic appointment / calendar entry with a start and end',
      todo: 'a task or reminder, open or completed',
      shopping: 'a shopping list item to buy',
      none: 'no specific type mentioned - search all types',
    },
  },
  search_events_completed: {
    type: 'choice',
    instructions:
      'search tool param: does the user want completed or open items?',
    criteria: {
      true: 'items already completed / ticked off',
      false: 'outstanding / not yet done items',
      none: 'completed status not mentioned - do not filter',
    },
  },
  search_events_date_from: {
    type: 'choice',
    instructions:
      "search tool param: where does the search window start? Pick the option whose date matches the user's words. Today is in `context`.",
    criteria: {
      ...dateCandidates(prompt),
      none: 'no date provided in prompt',
    },
  },
  search_events_date_to: {
    type: 'choice',
    instructions:
      "search tool param: where does the search window end? Pick the option whose date matches the user's words. Today is in `context`. For a single day mentioned, pick the same option for both start and end.",
    criteria: {
      ...dateCandidates(prompt),
      none: 'no date provided in prompt',
    },
  },
})

const datetimeCandidates = (message: string) =>
  Object.fromEntries(
    chrono.en.GB.parse(message)
      .filter((r) => r.start.isCertain('hour'))
      .map((r) => {
        const d = r.start.date()
        const iso = d.toISOString()
        const key = `${iso.slice(0, 10)}T${iso.slice(11, 16)}`
        return [key, `${weekday(d)} ${key}`]
      }),
  )

const createChoices = (prompt: string) => ({
  create_events_type: {
    type: 'choice',
    instructions:
      'create tool param: which item type does the user want to create?',
    criteria: {
      event: 'a classic appointment / calendar entry with a start and end',
      todo: 'a task or reminder',
      shopping: 'a shopping list item to buy',
      none: 'type not mentioned',
    },
  },
  // TODO: title - free text, figure out best handling
  create_events_title: {
    type: 'choice',
    instructions: 'create tool param: title - not handled yet',
    criteria: {
      none: 'not handled yet',
    },
  },
  create_events_detail: {
    type: 'choice',
    instructions:
      'create tool param: any extra info / address / links the user gave? Echo it exactly as the option value.',
    criteria: {
      none: 'no extra info provided',
    },
  },
  create_events_begin: {
    type: 'choice',
    instructions:
      "create tool param: when does the item start? Pick the option whose date/time matches the user's words. Today is in `context`. All-day options have no time, timed options include HH:mm.",
    criteria: {
      ...datetimeCandidates(prompt),
      ...dateCandidates(prompt),
      none: 'no date provided in prompt',
    },
  },
  create_events_end: {
    type: 'choice',
    instructions:
      "create tool param: when does the item end? For a single-day item pick the same date. Timed events need a time here too.",
    criteria: {
      ...datetimeCandidates(prompt),
      ...dateCandidates(prompt),
      none: 'no date provided in prompt',
    },
  },
  create_events_completed: {
    type: 'choice',
    instructions:
      'create tool param: is the item already completed/done?',
    criteria: {
      true: 'user says it is already done / completed',
      false: 'item is open / not yet done (the default)',
    },
  },
})

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
  const prompt =
    [...messages]
      .reverse()
      .find(
        (m): m is Extract<Messages[number], { text: string }> =>
          m.role === 'user',
      )?.text ?? ''
  const d = new Date()

  console.log('\n\n===')
  console.log({ prompt })

  const x = dateCandidates(prompt)
  console.log('chrono', x)

  const q = (await jev({
    state: {
      messages,
      context: `A calendar + todo app in sqlite
      we track all items in one events table: events, todos, shopping

      # 'event' table
      We track events, todos and shopping list in one table 'type' col
      all items have a 'title' + optional 'detail' col for extra info, address, links etc.

      ## type='event'
      - classic appointment / calendar entry
      - start & end required - both as date or datetime
      - all_day boolean col to indicate if date or datetime

      ## type='todo'
      - 'completed' col required, NULL when open, set to today's date 'YYYY-MM-DD' when done
      - 'begin' date optional
        - no begin date: standard todo item, appearing on todo list
        - 'begin' date/datetime: when the todo is due by / day or date it will be worked on / when to be reminded of it

      ## type='shopping'
      - same as todo: 'completed' NULL or 'YYYY-MM-DD' - same as todo: 'completed' col required & 'begin' date optional 'begin' date optional

      For shopping & todo lists, assume the user means uncompleted items.

      ## Information
      Today's date: ${d.toDateString()} ${d.toTimeString()} (UTC)
      'week' refers to a calendar week from Mo - Su
  `,
    },
    questions: {
      tool_choice: {
        type: 'choice',
        instructions:
          "which tool can be used to fulfil the user's latest request? taking into account the conversation",
        criteria: {
          create: 'create tool - to create a new event / todo item',
          search:
            'search tool - search the calendar database for events / todos / shopping items',
          update:
            'update tool - update one or many calendar items to update their fields',
          none: 'there is no tool to help answer the query appropriately',
        },
      },
      ...searchChoices(prompt),
      ...createChoices(prompt),
    },
  })) as JevResult

  const answers = q.answers
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
