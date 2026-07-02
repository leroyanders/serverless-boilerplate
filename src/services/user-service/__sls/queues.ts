import Aws from 'serverless/aws';
import * as SLS from '../../sls.defaults';
import {
    USER_EVENTS_QUEUE,
    USER_EVENTS_QUEUE_RESOURCE,
} from './consts';

const queues = {
    Resources: {
        ...SLS.createSQS({
            name: USER_EVENTS_QUEUE,
            resourceName: USER_EVENTS_QUEUE_RESOURCE,
        }),
    },
} as Aws.Resources;

export default queues;
