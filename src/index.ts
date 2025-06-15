// <docs-tag name="full-workflow-example">
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { _xClient } from './client';
import { TeweetClient } from './tweet';

type Env = {
	[x: string]: any;
	// Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
	DB: D1Database;
	FETCH_TWEET_WORKFLOW: Workflow;
};

const createPrismaClient = (env: Env) => {
	const adapter = new PrismaD1(env.DB);
	const prisma = new PrismaClient({
		adapter,
		log: ['warn', 'error'],
	});
	return prisma;
}

// User-defined params passed to your workflow
type Params = {
	screenName: string;
};

// <docs-tag name="workflow-entrypoint">
export class FetchTweetWorkflow extends WorkflowEntrypoint<Env, Params> {
	// Define a run() method
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const prisma = createPrismaClient(this.env);

		console.log(`fetch tweet workflow started ${this.env.AUTH_TOKEN}`);

		const xc = await _xClient(this.env.AUTH_TOKEN);

		const client = new TeweetClient(prisma, xc);

		try {
			const nextFetchUser = await step.do('get next user to fetch tweet', async () => {
				const u = await client.getNextFetchScreenName();
				if (!u) {
					console.warn('can not get next user to fetch tweets');
					throw new Error('can not get next user to fetch tweets');
				}
				return u;
			});

			let fetchedUserInfo = await step.do('fetch user info', async () => {
				return await client.fetchUser(nextFetchUser.screenName);
			});

			await step.do('fetch user recently tweets', async () => {
				await client.fetchUserTweetsAndReplies(fetchedUserInfo.restId);
			});

			await step.do('set last fetch time', async () => {
				await client.setUserLastFetchedTime(nextFetchUser.id)
			})
		} catch (e) {
			console.error(`fetch tweet workflow error ${e}`);
		}
	}
}
// </docs-tag name="workflow-entrypoint">

// <docs-tag name="workflows-fetch-handler">
export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		let url = new URL(req.url);

		if (url.pathname.startsWith('/favicon')) {
			return Response.json({}, { status: 404 });
		}

		// Get the status of an existing instance, if provided
		let id = url.searchParams.get('instanceId');
		if (id) {
			let instance = await env.FETCH_TWEET_WORKFLOW.get(id);
			return Response.json({
				status: await instance.status(),
			});
		}

		return Response.json({
			msg: "ok"
		})
	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		const params = {};

		const instance = await env.FETCH_TWEET_WORKFLOW.create({ params });
		console.log(`Started workflow: ${instance.id}`);
	}
};
// </docs-tag name="workflows-fetch-handler">
// </docs-tag name="full-workflow-example">
