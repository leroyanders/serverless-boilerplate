import Aws from 'serverless/aws';
import * as SLS from '../../sls.defaults';
import {
    USERS_TABLE,
    USERS_TABLE_RESOURCE,
} from './consts';

const tables = {
    Resources: {
        ...SLS.createDDB({
            name: USERS_TABLE,
            resourceName: USERS_TABLE_RESOURCE,
            key: [
                { AttributeName: 'id', KeyType: 'HASH' },
            ],
        }),
    },
} as Aws.Resources;

export default tables;
