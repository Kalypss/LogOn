<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import { ArrowUpRight, LogIn } from 'lucide-vue-next';
</script>

<template>
  <div class="flex flex-col gap-4 w-full max-w-xs mx-auto">
    <Button class="cursor-pointer active:scale-95 active:shadow-inner transition-transform group" aschild>
      <a href="/auth/register" class="w-full flex flex-row align-middle items-center gap-2 font-bold tracking-tight justify-center">
        Get Started
        <ArrowUpRight class="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
      </a>
    </Button>
    <Button class="cursor-pointer w-full active:scale-95 active:shadow-inner transition-transform" variant="secondary" aschild>
      <a href="/auth/login" class="flex flex-row align-middle items-center gap-2 font-bold tracking-tight justify-center">
        <LogIn /> Login
      </a>
    </Button>
  </div>
</template>