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
import { X } from "lucide-react";
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
};

export default function GoalsStep({ onComplete, initialData }: GoalsStepProps) {
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
              <FormLabel>Short-term Parenting Goals</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newShortTerm}
                    onChange={(e) => setNewShortTerm(e.target.value)}
                    placeholder="Add a short-term goal"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addShortTerm();
                      }
                    }}
                  />
                  <Button type="button" onClick={addShortTerm}>
                    Add
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
              <FormLabel>Long-term Parenting Goals</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newLongTerm}
                    onChange={(e) => setNewLongTerm(e.target.value)}
                    placeholder="Add a long-term goal"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLongTerm();
                      }
                    }}
                  />
                  <Button type="button" onClick={addLongTerm}>
                    Add
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
              <FormLabel>Areas Needing Support</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newSupportArea}
                    onChange={(e) => setNewSupportArea(e.target.value)}
                    placeholder="Add an area where you need support"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSupportArea();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSupportArea}>
                    Add
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

        <Button type="submit" className="w-full">
          Complete Onboarding
        </Button>
      </form>
    </Form>
  );
}