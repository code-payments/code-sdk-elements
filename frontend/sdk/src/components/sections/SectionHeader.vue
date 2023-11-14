<script setup lang="ts">
import { CodeLogo, BgGlow } from '../elements';

defineProps<{
    loading?: boolean;
    glow?: boolean;
}>();

</script>

<template>
    <div class="h-[2px] w-full absolute top-0 left-0 overflow-hidden" v-if="loading">
        <div class="h-full bg-indigo-400 loader"></div>
    </div>

    <div class="absolute inset-x-0 top-0 pointer-events-none" v-if="glow">
        <BgGlow />
    </div>
</template>

<style scoped>
.loader {
    animation: grow 2s ease-out forwards;
}   

@keyframes grow {
    0% {
        width: 0;
    }
    100% {
        width: 95%;
    }
}

</style>