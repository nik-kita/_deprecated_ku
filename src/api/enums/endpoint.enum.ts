import { config } from 'dotenv';

config();

/* eslint-disable no-shadow */
export enum PostEndpointEnum {
  ORDERS = '/api/v1/orders',
  BULLET_PRIVATE = '/api/v1/bullet-private'
}

export enum GetEndpointEnum {
  ACCOUNTS = '/api/v1/accounts',
  ORDER = '/api/v1/orders/',
}

export const HOST = process.env.MODE === 'prod'
    ? 'https://api.kucoin.com' as const
    : 'https://openapi-sandbox.kucoin.com' as const;
