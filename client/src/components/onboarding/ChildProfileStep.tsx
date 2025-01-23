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
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(0).max(18),
  specialNeeds: z.array(z.string()),
});

type Child = z.infer<typeof childSchema>;

type ChildProfileStepProps = {
  onComplete: (children: Child[]) => void;
  initialData?: Child[];
};

export default function ChildProfileStep({ onComplete, initialData = [] }: ChildProfileStepProps) {
  const [newSpecialNeed, setNewSpecialNeed] = useState("");
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [children, setChildren] = useState<Child[]>(initialData);

  const form = useForm<Child>({
    resolver: zodResolver(childSchema),
    defaultValues: children[activeChildIndex] || {
      name: "",
      age: 0,
      specialNeeds: [],
    },
  });

  const addChild = () => {
    setChildren([...children, { name: "", age: 0, specialNeeds: [] }]);
    setActiveChildIndex(children.length);
    form.reset({ name: "", age: 0, specialNeeds: [] });
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      const newChildren = children.filter((_, i) => i !== index);
      setChildren(newChildren);
      setActiveChildIndex(Math.max(0, activeChildIndex - 1));
      form.reset(newChildren[Math.max(0, activeChildIndex - 1)]);
    }
  };

  const addSpecialNeed = () => {
    if (newSpecialNeed.trim()) {
      const updatedChildren = [...children];
      const currentChild = updatedChildren[activeChildIndex] || { name: "", age: 0, specialNeeds: [] };
      currentChild.specialNeeds = [...(currentChild.specialNeeds || []), newSpecialNeed.trim()];
      updatedChildren[activeChildIndex] = currentChild;
      setChildren(updatedChildren);
      setNewSpecialNeed("");
    }
  };

  const removeSpecialNeed = (needIndex: number) => {
    const updatedChildren = [...children];
    const currentChild = updatedChildren[activeChildIndex];
    if (currentChild) {
      currentChild.specialNeeds = currentChild.specialNeeds.filter((_, i) => i !== needIndex);
      updatedChildren[activeChildIndex] = currentChild;
      setChildren(updatedChildren);
    }
  };

  const onSubmit = (data: Child) => {
    const updatedChildren = [...children];
    updatedChildren[activeChildIndex] = data;
    setChildren(updatedChildren);

    // Validate that we have at least one child with required fields
    if (updatedChildren.some(child => child.name && child.age >= 0)) {
      onComplete(updatedChildren);
    }
  };

  return (
    <div className="space-y-6 bg-transparent">
      <div className="flex gap-2 mb-4 flex-wrap">
        {children.map((child, index) => (
          <Button
            key={index}
            variant={activeChildIndex === index ? "default" : "outline"}
            onClick={() => {
              setActiveChildIndex(index);
              form.reset(children[index]);
            }}
            className="flex items-center gap-2"
          >
            {child.name || `Kind ${index + 1}`}
            {children.length > 1 && (
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
          Kind toevoegen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam van het kind</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Vul de naam in" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
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

              <div className="space-y-2">
                <FormLabel>Speciale behoeften of overwegingen</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={newSpecialNeed}
                    onChange={(e) => setNewSpecialNeed(e.target.value)}
                    placeholder="Voeg speciale behoeften toe"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpecialNeed();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addSpecialNeed}
                  >
                    Toevoegen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {children[activeChildIndex]?.specialNeeds.map((need, index) => (
                    <Badge key={index} variant="secondary">
                      {need}
                      <button
                        type="button"
                        onClick={() => removeSpecialNeed(index)}
                        className="ml-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

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