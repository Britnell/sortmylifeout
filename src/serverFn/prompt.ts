import * as chrono from 'chrono-node'
import { promptSpans } from './textSpans'

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

export const jevPayload = (messages: unknown) => {
  const prompt =
    ([...(messages as { role: string; text?: string }[])]
      .reverse()
      .find((m) => m.role === 'user')?.text ?? '') as string
  const d = new Date()

  return {
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
    }
}

export const searchChoices = (prompt: string) => ({
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

// candidate title options: use spans as both key and value (keys must be unique)
const titleCandidates = (prompt: string) =>
  Object.fromEntries(
    promptSpans(prompt).map((s) => [s, s]),
  )

export const createChoices = (prompt: string) => ({
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
  // title: candidate spans from the prompt, jev picks the best title text
  create_events_title: {
    type: 'choice',
    instructions:
      "create tool param: the item's title. Pick the option that best matches what the user calls the thing - short, no dates/times, no filler words.",
    criteria: {
      ...titleCandidates(prompt),
      none: 'no suitable title in prompt',
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
