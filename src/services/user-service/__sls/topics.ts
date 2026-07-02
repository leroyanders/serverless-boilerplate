import Aws from 'serverless/aws';
import * as SLS from '../../sls.defaults';
import {
    USER_EVENTS_TOPIC,
    USER_EVENTS_TOPIC_RESOURCE,
} from './consts';

const topics = {
    Resources: {
        ...SLS.createSNS({
            name: USER_EVENTS_TOPIC,
            resourceName: USER_EVENTS_TOPIC_RESOURCE,
        }),
    },
} as Aws.Resources;

export default topics;
