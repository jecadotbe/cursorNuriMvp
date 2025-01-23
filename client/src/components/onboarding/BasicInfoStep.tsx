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
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  experienceLevel: z.enum(["first_time", "experienced"], {
    required_error: "Please select your parenting experience",
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
                <Input placeholder="Vul jouwn naam in" {...field} />
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
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Vul je e-mailadres in"
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
              <FormLabel>Ouderschapservaring</FormLabel>
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
                    Nieuwe ouder
                  </SelectItem>
                  <SelectItem value="experienced">
                    Ervaren ouder
                  </SelectItem>
            
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Volgende
        </Button>
      </form>
    </Form>
  );
}