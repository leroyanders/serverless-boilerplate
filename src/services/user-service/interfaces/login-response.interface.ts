import type { LoginRequest } from '../types/login.type';
import type { LoginUserItem } from './login-user-item.interface';
import type { CalculateServiceReturnType } from '../../calculate-service/interfaces/calculate-service-return.interface';

export interface LoginResponse {
    data: LoginRequest;
    userId?: string;
    sum: CalculateServiceReturnType;
    user: LoginUserItem | undefined;
    tableName: string;
}
