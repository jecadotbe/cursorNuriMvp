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
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const childSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
  age: z.number().min(0).max(18),
  specialNeeds: z.array(z.string()),
});

const formSchema = z.object({
  children: z.array(childSchema).min(1, "Voeg ten minste één kind toe"),
});

type ChildProfileStepProps = {
  onComplete: (data: z.infer<typeof formSchema>) => void;
};

export default function ChildProfileStep({ onComplete }: ChildProfileStepProps) {
  const [newSpecialNeed, setNewSpecialNeed] = useState("");
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      children: [
        {
          name: "",
          age: 0,
          specialNeeds: [],
        },
      ],
    },
  });

  const addChild = () => {
    const currentChildren = form.getValues("children");
    form.setValue("children", [
      ...currentChildren,
      {
        name: "",
        age: 0,
        specialNeeds: [],
      },
    ]);
    setActiveChildIndex(currentChildren.length);
  };

  const removeChild = (index: number) => {
    const currentChildren = form.getValues("children");
    if (currentChildren.length > 1) {
      form.setValue(
        "children",
        currentChildren.filter((_, i) => i !== index)
      );
      setActiveChildIndex(Math.max(0, activeChildIndex - 1));
    }
  };

  const addSpecialNeed = (index: number) => {
    if (newSpecialNeed.trim()) {
      const currentChildren = form.getValues("children");
      const updatedChildren = [...currentChildren];
      updatedChildren[index] = {
        ...updatedChildren[index],
        specialNeeds: [...(updatedChildren[index].specialNeeds || []), newSpecialNeed.trim()],
      };
      form.setValue("children", updatedChildren);
      setNewSpecialNeed("");
    }
  };

  const removeSpecialNeed = (childIndex: number, needIndex: number) => {
    const currentChildren = form.getValues("children");
    const updatedChildren = [...currentChildren];
    updatedChildren[childIndex] = {
      ...updatedChildren[childIndex],
      specialNeeds: updatedChildren[childIndex].specialNeeds.filter(
        (_, i) => i !== needIndex
      ),
    };
    form.setValue("children", updatedChildren);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onComplete(data);
  };

  return (
    <div className="space-y-6 bg-transparent">
      <div className="flex gap-2 mb-4">
        {form.watch("children").map((_, index) => (
          <Button
            key={index}
            variant={activeChildIndex === index ? "default" : "outline"}
            onClick={() => setActiveChildIndex(index)}
            className="flex items-center gap-2"
          >
            Kind {index + 1}
            {form.watch("children").length > 1 && (
              <X
                className="h-4 w-4 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChild(index);
                }}
              />
            )}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={addChild}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Kind Toevoegen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name={`children.${activeChildIndex}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam van het Kind</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Voer de naam van het kind in" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`children.${activeChildIndex}.age`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leeftijd</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min={0}
                        max={18}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`children.${activeChildIndex}.specialNeeds`}
                render={() => (
                  <FormItem>
                    <FormLabel>Speciale Behoeften of Aandachtspunten</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newSpecialNeed}
                          onChange={(e) => setNewSpecialNeed(e.target.value)}
                          placeholder="Voeg speciale behoeften of aandachtspunten toe"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSpecialNeed(activeChildIndex);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => addSpecialNeed(activeChildIndex)}
                        >
                          Toevoegen
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.watch(`children.${activeChildIndex}.specialNeeds`)?.map((need, index) => (
                          <Badge key={index} variant="secondary">
                            {need}
                            <button
                              type="button"
                              onClick={() => removeSpecialNeed(activeChildIndex, index)}
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
                Doorgaan
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}