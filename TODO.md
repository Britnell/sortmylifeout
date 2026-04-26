in calendar.tsx - if i click on event i immediately open that for editing, atm it opens a weird dialog for creating and has editing option at the top of dialog - uegh
and only clicking on the calendar day outside the event row opens that day for creating.
calendar.tsx - always load entire weeks. so a week is mo-su - always load the current week as well as 1 week before and 1 week after, total of 3 weeks , and then in ui we always show three week rows above each each.
