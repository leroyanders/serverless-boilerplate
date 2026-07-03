import Aws from 'serverless/aws';
import * as SLS from '../../../sls.defaults';
import { USERS_TABLE_RESOURCE } from './const';
import { USERS_TABLE } from './tables';

const db = {
    Resources: {
        ...SLS.ddb({
            name: USERS_TABLE,
            resourceName: USERS_TABLE_RESOURCE,
            key: [
                { AttributeName: 'pk', KeyType: SLS.DynamoKeyType.HASH },
                { AttributeName: 'sk', KeyType: SLS.DynamoKeyType.RANGE },
            ],
        }),
    },
} as Aws.Resources;

export default db;
