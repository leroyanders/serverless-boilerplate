import {
    SERVERLESS_CALCULATE_SERVICE_NAME,
} from '../../calculate-service/__sls/const';
import * as SLS from '../../../sls.defaults';

export default SLS.createIamRoleStatements({
    invokeCalculateService: {
        Effect: SLS.IamEffect.ALLOW,
        Action: [SLS.IamAction.LAMBDA_INVOKE_FUNCTION],
        Resource: SLS.makeLambdaArn(SERVERLESS_CALCULATE_SERVICE_NAME),
    },
} satisfies SLS.IamRoleStatementGroup);
