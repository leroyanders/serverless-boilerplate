import {
    SumResolverArgType,
    SumResolverReturnType,
} from '../../types';

export const handler = async (
    params: SumResolverArgType,
): Promise<SumResolverReturnType> => {
    return {
        result: params.a + params.b,
    };
};