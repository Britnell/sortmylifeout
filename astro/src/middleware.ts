import { defineMiddleware } from "astro:middleware";
import { getSession } from "./db/auth";

export const onRequest = defineMiddleware(async (context, next) => {
	const session = await getSession(context.request);
	if (session) {
		context.locals.userId = session.userId;
	}
	return next();
});
