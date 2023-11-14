import { useConfig } from '../config';
import { Kik } from './';

import { EventChannel, InternalCardEvents, InternalEvents } from "@code-wallet/events";
import { PaymentRequestIntent, decode, encode } from "@code-wallet/library";
import * as proto from '@code-wallet/rpc';

class PaymentRequest {
    emitter: EventChannel<InternalEvents> | null;
    intent: PaymentRequestIntent;
    kikCode?: Uint8Array

    constructor(intent: PaymentRequestIntent) {
        this.intent = intent;
        this.emitter = null;
    }

    getAmount() {
        return this.intent.options.amount;
    }

    getCurrency() {
        return this.intent.options.currency;
    }

    getDestination() {
        return this.intent.options.destination;
    }

    async generateKikCode() {
        const { rendezvousPayload } = this.intent;
        this.kikCode = await Kik.encode(rendezvousPayload.toBinary());
    }

    toPayload() {
        const opts = this.intent.options;
        if (!opts.clientSecret || !opts.idempotencyKey) {
            opts.clientSecret = this.intent.getClientSecret();
        }

        return encode(opts);
    }

    static fromPayload(val: string, opt: { 
        clientSecret?: string,
        idempotencyKey?: string,
        successUrl?: string,
        cancelUrl?: string,
    } = {}) {
        const body = decode(val);

        if (opt.clientSecret) {
            body.clientSecret = opt.clientSecret;
        }

        if (opt.idempotencyKey) {
            body.idempotencyKey = opt.idempotencyKey;
        }

        if (opt.successUrl) {
            body.confirmParams = {
                ...body.confirmParams,
                success: { 
                    ...body.confirmParams?.success,
                    url: opt.successUrl
                },
            }
        }

        if (opt.cancelUrl) {
            body.confirmParams = {
                ...body.confirmParams,
                cancel: { 
                    ...body.confirmParams?.cancel,
                    url: opt.cancelUrl
                },
            }
        }

        const intent = new PaymentRequestIntent(body);
        const req = new PaymentRequest(intent);


        return req;
    }

    async toProto() {
        const { rendezvousKeypair } = this.intent;
        const { message, signature } = this.intent.sign();

        return new proto.SendMessageRequest({
            message: {
                kind: {
                    case: "requestToReceiveBill",
                    value: proto.RequestToReceiveBill.fromBinary(Buffer.from(message))
                }
            },
            rendezvousKey: {
                value: rendezvousKeypair.publicKey,
            },
            signature: {
                value: signature,
            }
        });
    }

    closeStream() {
        this.emitter = null;
    }

    async openStream(emitter: EventChannel<InternalEvents>) {
        this.emitter = emitter;
        await this.listen();
    }

    private async listen() {
        if (!this.emitter) { return; }

        const { rendezvousKeypair } = this.intent;
        const config = useConfig();
        const req = await this.toProto();

        await this.generateKikCode();

        const msgSend = await proto.RpcStream.createUnaryMethod(proto.Messaging, "sendMessage", config.wsPath());
        const msgStream = await proto.RpcStream.create(proto.Messaging, "openMessageStream", config.wsPath(), {
            onClose: () => {
                if (this.emitter) {
                    this.emitter.emit("streamClosed");
                }
            },
            onError: (err: any) => {
                if (this.emitter) {
                    this.emitter.emit("error", err);
                }
            },
        });

        try {
            const res = await msgSend(req);
            if (res.result != proto.SendMessageResponse_Result.OK) {
                if (this.emitter) {
                    this.emitter.emit("error", { message: "Failed to send message" });
                }
                return;
            }
        } catch (error) {
            if (this.emitter) {
                this.emitter.emit("error", error as any);
            }
            return;
        }

        msgStream.write(new proto.OpenMessageStreamRequest({
            rendezvousKey: new proto.RendezvousKey({
                value: rendezvousKeypair.publicKey,
            }),
        }));

        for await (const [res, err] of msgStream.read()) {
            // Check emitter at the start of the loop (if it is null, then this
            // stream has been closed)
            if (!this.emitter) break;

            if (err) {
                if (this.emitter) {
                    this.emitter.emit("error", err)
                }
                break;
            }

            if (res) {
                if (res instanceof proto.OpenMessageStreamResponse) {
                    for (const msg of res.messages) {
                        // Check emitter within the inner loop as well
                        if (!this.emitter) break;

                        if (this.emitter) {
                            this.emitter.emit(msg.kind.case as keyof InternalCardEvents);
                        }
                    }
                }
            }
        }
    }
}

export {
    PaymentRequest
}