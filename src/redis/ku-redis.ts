/* eslint-disable max-classes-per-file */
import Redis, { Redis as TRedis } from 'ioredis';
import { ChannelEnum, GLOBAL_STATE } from './global-state';

async function setDefaultState(pub: TRedis) {
    await Promise.all(Object.entries(GLOBAL_STATE).map(([channel, tumbler]) => pub.set(channel, tumbler)));
}
export class KuRedis {
    private static isDefaultReady = false;

    private constructor(private pub: TRedis, private sub: TRedis) {}

    public static async generate(...channels: ChannelEnum[]) {
        const pub = new Redis();
        const sub = pub.duplicate();

        await Promise.all([
            sub.subscribe(channels),
            KuRedis.isDefaultReady
                ? Promise.resolve()
                : setDefaultState(pub),
        ]);

        return new KuRedis(pub, sub);
    }

    public on<T extends object>(channel: ChannelEnum) {
        const thisIs: KuRedis = this;

        return {
            do(cb: (data: T) => void) {
                thisIs.sub.on('message', (_channel: string, _data: string) => {
                    if (_channel !== channel) return;

                    cb(JSON.parse(_data));
                });

                return {
                    async setState(state: Partial<typeof GLOBAL_STATE>) {
                        await Promise.all(Object.entries((state)).map(([key, value]) => thisIs.pub.set(key, value)));
                    },
                };
            },
        };
    }

    public to(channel: ChannelEnum) {
        const thisIs: KuRedis = this;
        const action = (_data: object) => thisIs.pub.publish(channel as string, JSON.stringify(_data));

        return {
            async onlyIfStateLike(state: Partial<typeof GLOBAL_STATE>) {
                const entries = Object.entries(state);
                const currentState = await Promise.all(entries.map(([key]) => thisIs.pub.get(key)));

                return {
                    async publish(data: object) {
                        if (!entries.some(([value], i) => value !== currentState[i])) {
                            await action(data);
                        }

                        return {
                            async setState(updateState: Partial<typeof GLOBAL_STATE>) {
                                await Promise.all(Object.entries((updateState)).map(([key, value]) => thisIs.pub.set(key, value)));
                            },
                        };
                    },
                };
            },
            async publish(data: object) {
                await action(data);

                return {
                    async setState(state: Partial<typeof GLOBAL_STATE>) {
                        await Promise.all(Object.entries((state)).map(([key, value]) => thisIs.pub.set(key, value)));
                    },
                };
            },
        };
    }
}
