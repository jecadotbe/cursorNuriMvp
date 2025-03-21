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
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  shortTerm: z.array(z.string()).min(1, "Add at least one short-term goal"),
  longTerm: z.array(z.string()).min(1, "Add at least one long-term goal"),
  supportAreas: z.array(z.string()).min(1, "Select at least one area where you need support"),
});

type GoalsStepProps = {
  onComplete: (data: z.infer<typeof formSchema>) => void;
  initialData?: z.infer<typeof formSchema>;
  isSubmitting?: boolean;
};

export default function GoalsStep({ onComplete, initialData, isSubmitting }: GoalsStepProps) {
  const [newShortTerm, setNewShortTerm] = useState("");
  const [newLongTerm, setNewLongTerm] = useState("");
  const [newSupportArea, setNewSupportArea] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      shortTerm: [],
      longTerm: [],
      supportAreas: [],
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      console.log("Submitting goals data:", data);
      onComplete(data);
    } catch (error) {
      console.error("Error submitting goals:", error);
    }
  };

  const addShortTerm = () => {
    if (newShortTerm.trim()) {
      const current = form.getValues("shortTerm");
      form.setValue("shortTerm", [...current, newShortTerm.trim()]);
      setNewShortTerm("");
    }
  };

  const addLongTerm = () => {
    if (newLongTerm.trim()) {
      const current = form.getValues("longTerm");
      form.setValue("longTerm", [...current, newLongTerm.trim()]);
      setNewLongTerm("");
    }
  };

  const addSupportArea = () => {
    if (newSupportArea.trim()) {
      const current = form.getValues("supportAreas");
      form.setValue("supportAreas", [...current, newSupportArea.trim()]);
      setNewSupportArea("");
    }
  };

  const removeShortTerm = (index: number) => {
    const current = form.getValues("shortTerm");
    form.setValue(
      "shortTerm",
      current.filter((_, i) => i !== index)
    );
  };

  const removeLongTerm = (index: number) => {
    const current = form.getValues("longTerm");
    form.setValue(
      "longTerm",
      current.filter((_, i) => i !== index)
    );
  };

  const removeSupportArea = (index: number) => {
    const current = form.getValues("supportAreas");
    form.setValue(
      "supportAreas",
      current.filter((_, i) => i !== index)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-transparent">
        <FormField
          control={form.control}
          name="shortTerm"
          render={() => (
            <FormItem>
              <FormLabel>Korte termijn opvoeddoelen</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newShortTerm}
                    onChange={(e) => setNewShortTerm(e.target.value)}
                    placeholder="Voeg een korte termijn doel toe"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addShortTerm();
                      }
                    }}
                  />
                  <Button type="button" onClick={addShortTerm}>
                    Toevoegen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("shortTerm").map((goal, index) => (
                    <Badge key={index} variant="secondary">
                      {goal}
                      <button
                        type="button"
                        onClick={() => removeShortTerm(index)}
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
          name="longTerm"
          render={() => (
            <FormItem>
              <FormLabel>Lange termijn opvoeddoelen</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newLongTerm}
                    onChange={(e) => setNewLongTerm(e.target.value)}
                    placeholder="Voeg een lange termijn doel toe"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLongTerm();
                      }
                    }}
                  />
                  <Button type="button" onClick={addLongTerm}>
                    Toevoegen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("longTerm").map((goal, index) => (
                    <Badge key={index} variant="secondary">
                      {goal}
                      <button
                        type="button"
                        onClick={() => removeLongTerm(index)}
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
          name="supportAreas"
          render={() => (
            <FormItem>
              <FormLabel>Gebieden waar je steun nodig hebt</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newSupportArea}
                    onChange={(e) => setNewSupportArea(e.target.value)}
                    placeholder="Voeg een gebied toe waar je steun nodig hebt"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSupportArea();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSupportArea}>
                    Toevoegen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("supportAreas").map((area, index) => (
                    <Badge key={index} variant="secondary">
                      {area}
                      <button
                        type="button"
                        onClick={() => removeSupportArea(index)}
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
            "Onboarding afronden"
          )}
        </Button>
      </form>
    </Form>
  );
}