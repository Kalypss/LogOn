<script lang="ts" setup>
import { ref } from 'vue';
import Label from '../ui/label/Label.vue';
import Textarea from '../ui/textarea/Textarea.vue';
import Button from '../ui/button/Button.vue';

const props = defineProps({
  username: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  error: {
    type: String,
    required: true
  }
});
</script>

<template>
  <form method="POST" class="max-w-md mx-auto mt-8 flex flex-col gap-6">
    <div>
      <h2 class="text-xl font-bold mb-2">Récupération de compte</h2>
      <p class="text-sm text-muted-foreground mb-4">
        Utilisateur ciblé : <span class="font-semibold text-primary">{username}</span>
      </p>
    </div>
    <div class="grid gap-2">
      <Label for="recovery_code" class="text-base">Code de récupération</Label>
      <Textarea
        name="recovery_code"
        maxlength="48"
        minlength="48"
        pattern="[A-Za-z0-9]{48}"
        required
        autocomplete="off"
        placeholder="Entrez votre code de récupération (48 caractères)"
        class="tracking-widest text-lg text-center font-mono"
        value={code}
      />
      {error && <span class="text-red-500 text-sm mt-1">{error}</span>}
    </div>
    <Button class="w-full cursor-pointer active:scale-95 active:shadow-inner transition-transform">
      Valider le code
    </Button>
  </form>
</template>
