import {
    USERS_TABLE_DEFAULT,
} from '@constants/service.const';

export const USERS_TABLE = process.env.USERS_TABLE_NAME ?? USERS_TABLE_DEFAULT;
