import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
  email: z.string().email("Voer een geldig e-mailadres in"),
  experienceLevel: z.enum(["first_time", "experienced", "multiple_children"], {
    required_error: "Selecteer je ervaring met ouderschap",
  }),
});

type BasicInfoStepProps = {
  onComplete: (data: z.infer<typeof formSchema>) => void;
  initialData?: z.infer<typeof formSchema>;
};

export default function BasicInfoStep({ onComplete, initialData }: BasicInfoStepProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      experienceLevel: undefined,
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onComplete(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-transparent">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jouw Naam</FormLabel>
              <FormControl>
                <Input placeholder="Voer je naam in" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mailadres</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Voer je e-mailadres in"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experienceLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ervaring met Ouderschap</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer je ervaringsniveau" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="first_time">
                    Eerste keer ouder
                  </SelectItem>
                  <SelectItem value="experienced">
                    Ervaren ouder
                  </SelectItem>
                  <SelectItem value="multiple_children">
                    Ouder van meerdere kinderen
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Doorgaan
        </Button>
      </form>
    </Form>
  );
}