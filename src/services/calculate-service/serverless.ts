import 'tsconfig-paths/register';
import Aws, { Serverless } from 'serverless/aws';
import {
    CALCULATE_SERVICE_RESOLVER_FN,
    CALCULATE_SERVICE_RESOLVER_HANDLER,
    SERVERLESS_CALCULATE_SERVICE_NAME,
} from '@constants/service.const';
import * as SLS from '../../sls.defaults';

module.exports = {
    ...SLS.serverless,

    service: SERVERLESS_CALCULATE_SERVICE_NAME,
    provider: {
        ...SLS.serverless.provider,
    } as Aws.Provider,

    functions: {
        [CALCULATE_SERVICE_RESOLVER_FN]: {
            name: SERVERLESS_CALCULATE_SERVICE_NAME,
            handler: CALCULATE_SERVICE_RESOLVER_HANDLER,
        },
    },
} as Serverless;
