import type {
    CalculateServiceArgType,
} from '../../calculate-service/interfaces/calculate-service-arg.interface';

export interface UserEventBridgeEvent {
    calculation?: CalculateServiceArgType;
    event: string;
    message: string;
}
