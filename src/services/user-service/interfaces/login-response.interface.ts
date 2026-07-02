import type { LoginRequest } from '../types/login.type';
import type { LoginUserItem } from './login-user-item.interface';
import type { SumResolverReturnType } from './sum-resolver-return.interface';

export interface LoginResponse {
    data: LoginRequest;
    userId?: string;
    sum: SumResolverReturnType;
    user: LoginUserItem | undefined;
    tableName: string;
}
