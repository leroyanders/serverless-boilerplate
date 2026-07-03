import type {
    CalculateServiceArgType,
} from '../../interfaces/calculate-service-arg.interface';
import type {
    CalculateServiceReturnType,
} from '../../interfaces/calculate-service-return.interface';

export const handler = async (
    params: CalculateServiceArgType,
): Promise<CalculateServiceReturnType> => {
    return {
        result: params.a + params.b,
    };
};
