import { invokeFunction } from '@lib/invoke-function';
import {
    CALCULATE_SERVICE_FN,
    SERVERLESS_CALCULATE_SERVICE_NAME,
} from '@constants/service.const';
import type {
    CalculateServiceArgType,
} from '../../interfaces/calculate-service-arg.interface';
import type {
    CalculateServiceReturnType,
} from '../../interfaces/calculate-service-return.interface';

export const invokeCalculate = async (
    params: CalculateServiceArgType,
): Promise<CalculateServiceReturnType> =>
    invokeFunction<CalculateServiceReturnType, CalculateServiceArgType>(
        SERVERLESS_CALCULATE_SERVICE_NAME,
        CALCULATE_SERVICE_FN,
        params,
    );
