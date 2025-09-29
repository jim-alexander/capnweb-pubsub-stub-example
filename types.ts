import { RpcStub } from "capnweb";


export interface CounterServer {
    get(): Promise<number>;
    increment(): Promise<void>;
    subscribe(callback: RpcStub<(count: number) => void>): void;
    notify(): Promise<void>;
}