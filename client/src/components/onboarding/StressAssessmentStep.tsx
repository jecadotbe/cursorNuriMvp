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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  stressLevel: z.enum(["low", "moderate", "high", "very_high"], {
    required_error: "Please select your current stress level",
  }),
  primaryConcerns: z.array(z.string()).min(1, "Please add at least one concern"),
  supportNetwork: z.array(z.string()).min(1, "Please add at least one support person or group"),
});

type StressAssessmentStepProps = {
  onComplete: (data: z.infer<typeof formSchema>) => void;
  initialData?: z.infer<typeof formSchema>;
  isSubmitting?: boolean;
};

export default function StressAssessmentStep({ onComplete, initialData, isSubmitting }: StressAssessmentStepProps) {
  const [newConcern, setNewConcern] = useState("");
  const [newSupport, setNewSupport] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      stressLevel: undefined,
      primaryConcerns: [],
      supportNetwork: [],
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onComplete(data);
  };

  const addConcern = () => {
    if (newConcern.trim()) {
      const currentConcerns = form.getValues("primaryConcerns");
      form.setValue("primaryConcerns", [...currentConcerns, newConcern.trim()]);
      setNewConcern("");
    }
  };

  const removeConcern = (index: number) => {
    const currentConcerns = form.getValues("primaryConcerns");
    form.setValue(
      "primaryConcerns",
      currentConcerns.filter((_, i) => i !== index)
    );
  };

  const addSupport = () => {
    if (newSupport.trim()) {
      const currentSupport = form.getValues("supportNetwork");
      form.setValue("supportNetwork", [...currentSupport, newSupport.trim()]);
      setNewSupport("");
    }
  };

  const removeSupport = (index: number) => {
    const currentSupport = form.getValues("supportNetwork");
    form.setValue(
      "supportNetwork",
      currentSupport.filter((_, i) => i !== index)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-transparent">
        <FormField
          control={form.control}
          name="stressLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Huidig stressniveau</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer je stressniveau" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Laag - Ik kan het goed aan</SelectItem>
                  <SelectItem value="moderate">
                    Matig - Enkele uitdagingen maar ik kan ermee omgaan
                  </SelectItem>
                  <SelectItem value="high">
                    Hoog - Vaak overweldigd
                  </SelectItem>
                  <SelectItem value="very_high">
                    Zeer hoog - Veel ondersteuning nodig
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryConcerns"
          render={() => (
            <FormItem>
              <FormLabel>Belangrijkste opvoedingszorgen</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newConcern}
                    onChange={(e) => setNewConcern(e.target.value)}
                    placeholder="Voer een zorg in"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addConcern();
                      }
                    }}
                  />
                  <Button type="button" onClick={addConcern}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("primaryConcerns").map((concern, index) => (
                    <Badge key={index} variant="secondary">
                      {concern}
                      <button
                        type="button"
                        onClick={() => removeConcern(index)}
                        className="ml-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supportNetwork"
          render={() => (
            <FormItem>
              <FormLabel>Steunnetwerk (Mijn Village)</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newSupport}
                    onChange={(e) => setNewSupport(e.target.value)}
                    placeholder="Voeg familie, vrienden of professionals toe"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSupport();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSupport}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("supportNetwork").map((support, index) => (
                    <Badge key={index} variant="secondary">
                      {support}
                      <button
                        type="button"
                        onClick={() => removeSupport(index)}
                        className="ml-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opslaan...
            </>
          ) : (
            "Verder"
          )}
        </Button>
      </form>
    </Form>
  );
}