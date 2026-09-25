import { dateCandidates, datetimeCandidates } from './dates'
import { promptSpans } from './textSpans'

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
      if the user asks about "this week" implying the future (upcoming, what's on), interpret it as the next 7 days from today - not the calendar week. Only use calendar week Mo - Su when the user refers to the past too (e.g. "what happened this week")
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
      'search tool param: item type filter - this is optional, only pick a type if the user explicitly asks for that kind of item',
    criteria: {
      event: 'user explicitly wants only appointments / calendar entries with a start and end',
      todo: 'user explicitly wants only tasks or reminders',
      shopping: 'user explicitly wants only shopping list items to buy',
      none: 'no specific type asked for - return ALL types (events, todos and shopping), e.g. schedule questions like "what\'s happening this weekend" or "what\'s on today"',
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
      "search tool param: where does the search window start? Pick the option whose date matches the user's words. Today is in `context`. If the user asks about "this week" implying the future, pick 'today'. Only pick Monday if the user explicitly means the whole calendar week (including past days).",
    criteria: {
      ...dateCandidates(prompt),
      none: 'no date provided in prompt',
    },
  },
  search_events_date_to: {
    type: 'choice',
    instructions:
      "search tool param: where does the search window end? Pick the option whose date matches the user's words. Today is in `context`. For a single day mentioned, pick the same option for both start and end. For "this week" implying the future, pick 'today + 7 days'.",
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
