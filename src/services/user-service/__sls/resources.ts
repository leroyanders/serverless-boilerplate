import Aws from 'serverless/aws';
import queues from './queues';
import tables from './tables';
import topics from './topics';

export const Resources = {
    ...tables.Resources,
    ...queues.Resources,
    ...topics.Resources,
} as Aws.Resources['Resources'];

export const Outputs = {} as Aws.Resources['Outputs'];
