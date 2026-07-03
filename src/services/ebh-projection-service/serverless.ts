import 'tsconfig-paths/register';
import Aws, { Serverless } from 'serverless/aws';
import {
    EBH_PROJECTION_HANDLE_USER_EVENTS_FN,
    EBH_PROJECTION_HANDLE_USER_EVENTS_HANDLER,
    SERVERLESS_EBH_PROJECTION_SERVICE_NAME,
    USER_EVENTS_EVENT_BUS_DEFAULT,
    USER_EVENTS_EVENT_DETAIL_TYPE,
    USER_EVENTS_EVENT_SOURCE,
} from './__sls/const';
import * as SLS from '../../sls.defaults';
import statements from './__sls/roles';

const USER_EVENTS_EVENT_BUS = process.env.USER_EVENTS_EVENT_BUS_NAME ?? USER_EVENTS_EVENT_BUS_DEFAULT;

module.exports = {
    ...SLS.serverless,

    service: SERVERLESS_EBH_PROJECTION_SERVICE_NAME,
    provider: {
        ...SLS.serverless.provider,
        iam: {
            role: {
                statements,
            },
        },
    } as Aws.Provider,

    functions: {
        [EBH_PROJECTION_HANDLE_USER_EVENTS_FN]: {
            handler: EBH_PROJECTION_HANDLE_USER_EVENTS_HANDLER,
            events: [
                {
                    eventBridge: {
                        eventBus: SLS.makeEventBridgeArn(USER_EVENTS_EVENT_BUS),
                        pattern: {
                            'detail-type': [USER_EVENTS_EVENT_DETAIL_TYPE],
                            source: [USER_EVENTS_EVENT_SOURCE],
                        },
                    },
                },
            ],
        },
    },
} as Serverless;
