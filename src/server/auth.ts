import { eventDispatcher } from '@deepkit/event';
import { httpWorkflow } from '@deepkit/http';
import { inject } from '@deepkit/injector';
import {appConfig} from './config';

export class AuthListener {
    constructor(
        @inject(appConfig.token('benchmarkAuthToken')) protected authToken: string
    ) {
    }

    @eventDispatcher.listen(httpWorkflow.onAuth)
    async onAuth(event: typeof httpWorkflow.onAuth.event) {
        if (event.route.groups.includes('benchmarkAuth')) {
            if (event.request.headers.authorization !== this.authToken) {
                event.response.writeHead(403);
                event.response.end('Nope');
            }
        }
    }
}
