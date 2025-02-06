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
import { X, Plus, Loader2 } from "lucide-react";
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
  isSubmitting?: boolean;
};

export default function ChildProfileStep({ onComplete, initialData = [], isSubmitting = false }: ChildProfileStepProps) {
  const [newSpecialNeed, setNewSpecialNeed] = useState("");
  const [activeChildIndex, setActiveChildIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [children, setChildren] = useState<Child[]>(initialData);

  const form = useForm<Child>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: "",
      age: 0,
      specialNeeds: [],
    },
  });

  const addChild = () => {
    setShowForm(true);
    setActiveChildIndex(children.length);
    form.reset({ name: "", age: 0, specialNeeds: [] });
  };

  const removeChild = (index: number) => {
    const newChildren = children.filter((_, i) => i !== index);
    setChildren(newChildren);
    setActiveChildIndex(null);
    setShowForm(false);
    form.reset({ name: "", age: 0, specialNeeds: [] });

    // If we removed the last child, we should hide any lingering form
    if (newChildren.length === 0) {
      setShowForm(false);
      setActiveChildIndex(null);
    }
  };

  const editChild = (index: number) => {
    setShowForm(true);
    setActiveChildIndex(index);
    form.reset(children[index]);
  };

  const addSpecialNeed = () => {
    if (newSpecialNeed.trim()) {
      const currentSpecialNeeds = form.getValues("specialNeeds");
      form.setValue("specialNeeds", [...currentSpecialNeeds, newSpecialNeed.trim()]);
      setNewSpecialNeed("");
    }
  };

  const removeSpecialNeed = (needIndex: number) => {
    const currentSpecialNeeds = form.getValues("specialNeeds");
    form.setValue(
      "specialNeeds",
      currentSpecialNeeds.filter((_, i) => i !== needIndex)
    );
  };

  const saveChild = (data: Child) => {
    if (activeChildIndex !== null) {
      const updatedChildren = [...children];
      updatedChildren[activeChildIndex] = data;
      setChildren(updatedChildren);
      setActiveChildIndex(null);
      setShowForm(false);
      form.reset({ name: "", age: 0, specialNeeds: [] });
    }
  };

  const handleContinue = () => {
    // Only proceed if we have at least one child saved
    if (children.some(child => child.name && child.age >= 0)) {
      onComplete(children);
    }
  };

  return (
    <div className="space-y-6 bg-transparent">
      <div className="flex gap-2 mb-4 flex-wrap">
        {children.map((child, index) => (
          <Button
            key={index}
            variant={activeChildIndex === index ? "default" : "outline"}
            onClick={() => editChild(index)}
            className="flex items-center gap-2"
          >
            {child.name || `Kind ${index + 1}`}
            <X
              className="h-4 w-4 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeChild(index);
              }}
            />
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

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(saveChild)} className="space-y-6">
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
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            onFocus={(e) => e.target.value === '0' && e.target.value === ''}
                            min={0}
                            max={18}
                            placeholder="0"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none touch-manipulation"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const currentValue = field.value || 0;
                                if (currentValue < 18) {
                                  field.onChange(currentValue + 1);
                                }
                              }}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const currentValue = field.value || 0;
                                if (currentValue > 0) {
                                  field.onChange(currentValue - 1);
                                }
                              }}
                            >
                              -
                            </Button>
                          </div>
                        </div>
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
                    {form.watch("specialNeeds").map((need, index) => (
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
                    "Kind Opslaan"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {children.length > 0 && (
        <Button
          onClick={handleContinue}
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Doorgaan...
            </>
          ) : (
            "Doorgaan"
          )}
        </Button>
      )}
    </div>
  );
}