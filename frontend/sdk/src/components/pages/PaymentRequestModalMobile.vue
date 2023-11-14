<script setup lang="ts">
import { Ref, onMounted, onUnmounted, ref } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'

import { PaymentRequest, UserAgent } from "../../utils"
import { EventChannel, InternalEvents } from "@code-wallet/events";
import { formatCurrency } from "../../utils";
import { CodeSpinner, ErrorMessage } from '../elements';

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

const hasScanned = ref(false);
const hasRejected = ref(false);
const hasCompletedIntent = ref(false);
const hasError = ref(false);
const errMessage = ref("");
const hasApp = localStorage.getItem('codewallet:hasApp') === 'true';

const isDelaying = ref(hasApp);
const isLoading = ref(true);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function openInAppStore() {
  var url: string;

  if (UserAgent.iOS() || UserAgent.Safari() || !UserAgent.Android()) {
    // Apple App Store URL
    url = 'https://apps.apple.com/us/app/code-wallet/id1562384846';
  } else {
    // Google Play Store URL
    // url = 'https://play.google.com/store/apps/details?id=com.getcode';
    url = 'https://www.getcode.com/download';
  }

  channel.emit('navigate', { url });
}

function getAppUrl() {
  const payload = paymentRequest.value.toPayload();
  const base = window.location.href.replace(/https?:\/\//, "codewallet://");
  return base.replace(/p=([^&]+)/, `p=${payload}`);
}

function openInApp() {
  channel.emit('navigate', { url: getAppUrl() });
}

function onClose () {
  open.value = false;
  paymentRequest.value.closeStream();
  setTimeout(() => { channel.emit('clientRejectedPayment') }, 800);
}

channel.on("error", (msg) => { hasError.value = true; errMessage.value = `${msg}`;  });
channel.on("streamTimeout", () => { hasError.value = true; });
channel.on("streamClosed", () => { hasError.value = true; });
channel.on("clientRejectedPayment", () => { hasRejected.value = true; });
channel.on("intentSubmitted", () => { 
  hasCompletedIntent.value = true; 
  localStorage.setItem('codewallet:hasApp', 'true');
});
channel.on("codeScanned", () => { hasScanned.value = true; });

channel.on("beforeInvoke", () => {
  isLoading.value = true;
  isDelaying.value = true;
});

channel.on("afterInvoke", async () => {
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

  // If we know the user has the app, then give the system prompt asking them if
  // they want to open the app, wait 5 seconds, then show the modal content
  // underneath the system prompt. Unfortunately, there is no way to know if the
  // user has clicked on the system prompt, so we choose 5 seconds arbitrarily
  // here as a value that is long enough for a user action. Worst case, they
  // don't have the app and see the spinner for 1-4 seconds (which we don't
  // expect will happen).

  if (hasApp && !hasError) {
    openInApp();
    await sleep(5000);
  } 

  isDelaying.value = false;
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
    paymentRequest.value.generateKikCode()
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

        <TransitionChild as="template" enter="duration-[0ms]" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-[800ms]" leave-from="opacity-100" leave-to="opacity-0">
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

              <div class="text-center font-avenir-next-bold py-[100px]">

                <DialogPanel class="relative transform  transition-all w-full max-w-4xl p-6 mx-auto">

                  <div class="max-w-md m-auto" ref="empty">

                    <div v-if="hasError">
                      <ErrorMessage :errMessage="errMessage" />
                    </div>

                    <div v-else>
                    <div v-if="isDelaying">
                      <span class="absolute left-1/2 -translate-x-1/2 pt-1">
                        <CodeSpinner />
                      </span>
                    </div>

                    <div v-else>

                      <div class="delay-show-1 pb-10">
                        <div class="pb-5 text-white text-[28px] text-center leading-tight
                          tracking-tighter font-medium">Use the Code Wallet app to purchase for 
                          {{ formatCurrency(paymentRequest.getAmount()!, paymentRequest.getCurrency()!) }}
                        </div>

                        <button v-if="!isLoading" type="button" @click="openInApp()" 
                        class="mt-6 block rounded-md bg-white py-4 text-base
                        font-semibold text-[#0f0c1f] text-center shadow-sm
                        w-full">Open Code</button>

                        <button v-else type="button" 
                        class="mt-6 block rounded-md bg-white py-4 text-base
                        font-semibold text-[#0f0c1f] text-center shadow-sm
                        w-full whitespace-nowrap">
                          <span class="absolute left-1/2 -translate-x-1/2 pt-1">
                            <CodeSpinner v-if="isLoading"/>
                          </span>
                          &nbsp;
                        </button>
                      </div>

                      <div class="delay-show-2 border-b border-[#565C86]"></div>

                      <div class="delay-show-3 mt-10">
                        <div class="pb-10 text-white text-[28px] text-center
                        leading-tight tracking-tighter font-medium">
                        Don’t have the <br> Code Wallet app yet?</div>

                        <div class="flex content-center text-white">
                          <div class="grow h-14 grid content-center pl-3 text-lg leading-6">
                            Download it and create an account.<br>
                            Get your first $1 for free.
                          </div>
                        </div>

                        <button type="button" @click="openInAppStore()"
                        class="mt-6 block rounded-md bg-transparent border
                        border-white py-4 text-base font-semibold text-[#0f0c1f]
                        text-center text-white shadow-sm w-full">Download Code
                        Now</button>
                      </div>

                    </div>
                    </div>

                  </div>

                </DialogPanel>

                <span v-if="false" 
                  class="scale-75 bottom-2 left-2 origin-left truncate text-xs block text-left p-2 text-red-500 absolute z-10 bg-black mt-10">
                  <span class="text-white font-bold underline">debug info</span><br>
                  <span class="text-white font-bold">IS_WAITING:</span> {{ isLoading }}<br>
                  <span class="text-white">RENDEZVOUS:</span> {{ paymentRequest.intent.getIntentId() }}<br>
                  <span class="text-white">AMOUNT:</span> {{ paymentRequest.getAmount() }}<br>
                  <span class="text-white">CURRENCY:</span> {{ paymentRequest.getCurrency() }}<br>
                  <span class="text-white">DESTINATION:</span> {{ paymentRequest.getDestination() }}<br>
                  <span class="text-white">CLIENT SECRET:</span> {{ clientSecret }}<br>
                  <span class="text-white">IDEMPOTENCY KEY:</span> {{ idempotencyKey }}<br>
                </span>

              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>

</template>

<style scoped>
@keyframes fade-slide {
  0% {
    opacity: 0;
    transform: translateY(-0.5vh);
    transform-origin: top center;
  }

  100% {
    opacity: 1;
  }
}

.delay-show-1 {
  opacity: 0;
  animation: fade-slide 0.5s ease-out 0s forwards;
}

.delay-show-2 {
  opacity: 0;
  animation: fade-slide 0.5s ease-out 0.5s forwards;
}

.delay-show-3 {
  opacity: 0;
  animation: fade-slide 0.5s ease-out 1.0s forwards;
}

.delay-show-4 {
  opacity: 0;
  animation: fade-slide 0.5s ease-out 1.5s forwards;
}
</style>