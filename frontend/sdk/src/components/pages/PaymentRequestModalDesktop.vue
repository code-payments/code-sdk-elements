<script setup lang="ts">
import { Ref, onMounted, onUnmounted, ref } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { CodeRequest, CodeSpinner, DownloadAppQR, ErrorMessage } from '../elements';
import { PaymentRequest, formatCurrency } from "../../utils"
import { EventChannel, InternalEvents } from "@code-wallet/events";

const props = defineProps({
  id: { type: String, required: true, },
  payload: { type: String, required: true, },
});

const el = ref<HTMLElement | null>(null);
const channel = new EventChannel<InternalEvents>(props.id);
const paymentRequest = ref(PaymentRequest.fromPayload(props.payload));
const clientSecret : Ref<string | undefined> = ref();
const idempotencyKey : Ref<string | undefined> = ref();
const successUrl : Ref<string | undefined> = ref();
const cancelUrl : Ref<string | undefined> = ref();

const open = ref(true);
const empty = ref(null);

const isLoading = ref(true);
const showDownloadQr = ref(false);
const hasScanned = ref(false);
const hasRejected = ref(false);
const hasCompletedIntent = ref(false);
const hasError = ref(false);
const errMessage = ref("");
const openedAt = Date.now();

function onDownload() {
  showDownloadQr.value = !showDownloadQr.value;
}

function onClose() {
  // Avoid an obscure headlessui Firefox bug where the dialog is closed on open (hard to reproduce)
  // Source of issue:
  // https://github.com/tailwindlabs/headlessui/blob/1469b85c36802265c2409f443f926e1bb02230d4/packages/%40headlessui-vue/src/components/dialog/dialog.ts#L280-L287

  if (Date.now() > (openedAt + 100)) {
    open.value = false;
    setTimeout(() => { channel.emit('clientRejectedPayment') }, 800);
  } else {
    open.value = true;
  }
}

channel.on("error", (msg) => { hasError.value = true; errMessage.value = `${msg}`;  });
channel.on("streamTimeout", () => { hasError.value = true; });
channel.on("streamClosed", () => { hasError.value = true; });
channel.on("clientRejectedPayment", () => { hasRejected.value = true; });
channel.on("intentSubmitted", () => { hasCompletedIntent.value = true; });
channel.on("codeScanned", () => { hasScanned.value = true; });

channel.on("beforeInvoke", () => {
  isLoading.value = true;
})
channel.on("afterInvoke", () => {
  const shouldRecreateRequest = clientSecret.value || 
    idempotencyKey.value || 
    successUrl.value || 
    cancelUrl.value;

  if (shouldRecreateRequest) {
    paymentRequest.value = PaymentRequest.fromPayload(props.payload, {
      clientSecret: clientSecret.value,
      idempotencyKey: idempotencyKey.value,
      successUrl: successUrl.value,
      cancelUrl: cancelUrl.value,
    });
  }

  paymentRequest.value.openStream(channel);
  isLoading.value = false;
})

channel.on("updatedClientSecret", (args: { value: string }) => {
  clientSecret.value = args.value;
});
channel.on("updatedIdempotencyKey", (args: { value: string }) => {
  idempotencyKey.value = args.value;
});
channel.on("updatedSuccessUrl", (args: { value: string }) => {
  successUrl.value = args.value;
});
channel.on("updatedCancelUrl", (args: { value: string }) => {
  cancelUrl.value = args.value;
});

onMounted(() => {
  // We probably don't have the right info yet to generate the kikcode properly,
  // however, we can ask the client to do it anyway in order to prefetch and
  // warm all assets required for showing the kikcode.
  if (paymentRequest.value && !paymentRequest.value.kikCode) {
    paymentRequest.value.generateKikCode();
  }
});

onUnmounted(() => {
  if (paymentRequest.value) {
    paymentRequest.value.closeStream();
  }
});
</script>

<template>
  <div ref="el">

    <TransitionRoot as="template" :show="open">
      <Dialog as="div" class="relative z-10" @close="onClose" :initialFocus="empty">

        <TransitionChild as="template" 
          enter="duration-[0ms]" 
          enter-from="opacity-0" 
          enter-to="opacity-100"
          leave="duration-[800ms]" 
          leave-from="opacity-100" 
          leave-to="opacity-0">
          <div class="fixed inset-0 bg-opacity-80 transition-opacity backdrop-blur-sm bg-black" />
        </TransitionChild>

        <div class="fixed inset-0 z-10 overflow-y-auto">

          <TransitionChild as="template" enter="duration-[800ms]" enter-from="opacity-0" enter-to="opacity-100"
            leave="duration-[800ms]" leave-from="opacity-100" leave-to="opacity-0">
            <button @click="onClose" type="button"
              class="absolute right-10 top-10 flex h-14 w-14 items-center justify-center rounded-full bg-black z-100">
              <XMarkIcon class="h-7 w-7 text-white" aria-hidden="true" />
            </button>
          </TransitionChild>

          <div class="grid h-screen place-items-center">
            <TransitionChild as="template" enter="duration-[800ms]"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100" leave="duration-[800ms]"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">


              <div class="text-center py-[100px]">

                <DialogPanel class="relative transform  transition-all w-full max-w-4xl p-6 mx-auto">

                  <Transition>
                    <div class="max-w-md m-auto" ref="empty">

                      <div v-if="hasError">
                        <ErrorMessage :errMessage="errMessage" />
                      </div>

                      <div v-else class="delay-500">
                        <h2 class="text-white text-[34px] leading-tight
                        font-avenir-next-bold mb-10">
                          Scan with the Code app to pay
                          {{ formatCurrency(paymentRequest.getAmount()!, paymentRequest.getCurrency()!) }}
                        </h2>

                        <div class="m-auto relative">

                          <div class="absolute top-[10vh] right-0 max-w-[21vh] mv-right-start"
                            :class="{ 'mv-right-end': showDownloadQr }">

                            <a @click="onDownload()" href="https://www.getcode.com/download" target="_blank">
                              <DownloadAppQR v-if="showDownloadQr" @complete="onDownload" />
                            </a>
                          </div>

                          <div v-show="!isLoading" class="mv-left-start delay-800"
                            :class="{ 'invisible': hasScanned, 'mv-left-end': showDownloadQr, }">
                            <CodeRequest 
                              :payload="paymentRequest.kikCode" 
                              :amount="paymentRequest.intent.options.amount" 
                              :currency="paymentRequest.intent.options.currency"
                              class="bounce" />
                          </div>

                          <div v-show="isLoading" class="h-[45.9vh]">
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2">
                              <CodeSpinner class="text-white" />
                            </div>
                          </div>

                          <div v-if="hasScanned" class="absolute top-1/2 left-1/2 -translate-x-1/2">
                            <p class="text-white text-[12px] leading-tight font-avenir-next-bold pb-10">
                              Confirm payment on Code
                              <button type="button" @click="hasScanned = false"
                                class="underline block mt-2 text-center w-full">Need to scan again?</button>
                            </p>
                          </div>
                        </div>

                        <div>
                          <p class="mt-10 text-white text-[16px] leading-tight font-avenir-next-bold pb-10">
                            Don’t have the Code app yet?<br>
                            <button v-if="!showDownloadQr" @click="onDownload()" class="underline">Download Now</button>
                            <a v-else @click="onDownload()" href="https://www.getcode.com/download" target="_blank" class="underline">Download Now</a>
                            and get your first $1 free
                          </p>
                        </div>

                      </div>
                    </div>
                  </Transition>

                </DialogPanel>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<style scoped>
.mv-right-start {
  transition: all 0.25s ease-out;
  transform: scale(0.8);
  opacity: 0;
}

.mv-right-end {
  transform: translateX(5vh);
  opacity: 1;
}

.mv-left-start {
  transition: all 0.25s ease-out;
}

.mv-left-end {
  transform: scale(0.8) translateX(-20vh);
  opacity: 1;
}

@keyframes fade {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.delay-500 {
  opacity: 0;
  animation: delay 0.5s linear 0.5s forwards;
}

.delay-800 {
  opacity: 0;
  animation: delay 0.8s linear 0.8s forwards;
}

@keyframes delay {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.bounce {
  transform: scale(0.6);
  animation: pop 0.45s linear(0, 0.67793 0.01%, 0.70702 1.26%, 0.7582 2.65%, 1.06306 9.091%,
      1.11795 10.871%, 1.14755 12.611%, 1.15324 13.471%, 1.1533 14.341%,
      1.13654 16.202%, 1.10139 18.102%, 0.96192 24.192%, 0.93228 26.333%,
      0.92023 28.443%, 0.92146 29.893%, 0.93014 31.463%, 1.01182 39.104%,
      1.02627 41.204%, 1.03255 43.274%, 1.02807 46.425%, 0.98852 54.095%,
      0.97849 58.236%, 0.98079 61.516%, 0.99924 68.857%, 1.00436 72.677%,
      1.00367 76.268%, 0.99199 88.109%, 0.99732 99.99%, 1) 0.1s forwards;
  animation-delay: 800ms;
}

@keyframes pop {
  0% {
    transform: scale(0.6);
  }

  100% {
    transform: scale(1);
  }
}
</style>