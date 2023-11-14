<script setup lang=ts>
import { CodeLogo } from '../elements';
</script>

<template>
  <footer class="hidden sm:block">
    <div class="mx-auto max-w-7xl px-6 pb-8">
      <div class="border-t border-white/10 pt-8 sm:mt-10 flex justify-between items-center">
        <p class="text-xs leading-5 text-gray-400">&copy; Code Inc. 2023</p>
        <p class="text-xs leading-5 text-gray-400 text-right">
          <a href="https://www.getcode.com/">
              <CodeLogo class="h-7" />
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>