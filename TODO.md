
- ai.ts - sql query safety checks. what if we first remove any text inside quotes '...' to remove potential words in string, so an event can be called 'drop table', and then we can easily filter by keywords left after?

- ai.ts - read our prompts, we have events + todos, now we want a shopping list. i want users to say remind me to buy milk / flowers...  groceries. so probably a new type 'shopping' / groceries. shopping seems broader , groceriers implies just food. but its meant for things i want to be reminded of when im at the shop. not like 'buy new jeans when im in town'

- calendar.tsx - the native time input are terrible, lets just make it a normal text input, but actually can we use a
