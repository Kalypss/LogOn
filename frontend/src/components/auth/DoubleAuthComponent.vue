<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { h } from 'vue'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  PinInput,
  PinInputGroup,
  PinInputSlot,
} from '@/components/ui/pin-input'
import { toast } from '@/components/ui/toast'

const formSchema = toTypedSchema(z.object({
  pin: z.array(z.coerce.string()).length(6, { message: 'Invalid input' }),
}))

const { handleSubmit, setFieldValue } = useForm({
  validationSchema: formSchema,
  initialValues: {
  },
})

const onSubmit = handleSubmit(({ pin }) => {
  toast({
    title: 'You submitted the following values:',
    description: h('pre', { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(pin.join(''), null, 2))),
  })
})

const handleComplete = (e: string[]) => console.log(e.join(''))
</script>

<template>
  <form class="flex flex-col gap-5" @submit="onSubmit">
    <FormField v-slot="{ componentField, value }" name="pin">
      <FormItem>
        
        <FormLabel></FormLabel>
        <FormControl>
          <PinInput
            id="pin-input"
            :model-value="value"
            placeholder="○"
            class="flex gap-2 items-center mt-1"
            otp
            type="number"
            :name="componentField.name"
            @complete="handleComplete"
            @update:model-value="(arrStr) => {
              setFieldValue('pin', arrStr)
            }"
          >
            <PinInputGroup>
              <PinInputSlot
                v-for="(id, index) in 6"
                :key="id"
                :index="index"
              />
            </PinInputGroup>
          </PinInput>
        </FormControl>
        <FormDescription>
          Enter the 6-digit code of your <br> authentication app.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <Button type="submit" class="w-full">Submit</Button>
  </form>
</template>

<style scoped>

@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

*{
  font-family: "Inter";
}
</style>