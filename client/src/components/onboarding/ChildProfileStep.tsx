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
import { X, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const childSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(0).max(18),
  specialNeeds: z.array(z.string()),
  routines: z.record(z.any()),
  challenges: z.record(z.any()),
});

const formSchema = z.array(childSchema).min(1, "Please add at least one child");

type ChildProfileStepProps = {
  onComplete: (data: z.infer<typeof formSchema>) => void;
};

export default function ChildProfileStep({ onComplete }: ChildProfileStepProps) {
  const [children, setChildren] = useState<z.infer<typeof formSchema>>([
    {
      name: "",
      age: 0,
      specialNeeds: [],
      routines: {},
      challenges: {},
    },
  ]);
  const [newSpecialNeed, setNewSpecialNeed] = useState("");
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: children,
  });

  const addChild = () => {
    setChildren([
      ...children,
      {
        name: "",
        age: 0,
        specialNeeds: [],
        routines: {},
        challenges: {},
      },
    ]);
    setActiveChildIndex(children.length);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      const newChildren = children.filter((_, i) => i !== index);
      setChildren(newChildren);
      setActiveChildIndex(Math.max(0, activeChildIndex - 1));
    }
  };

  const addSpecialNeed = (index: number) => {
    if (newSpecialNeed.trim()) {
      const updatedChildren = [...children];
      updatedChildren[index] = {
        ...updatedChildren[index],
        specialNeeds: [...updatedChildren[index].specialNeeds, newSpecialNeed.trim()],
      };
      setChildren(updatedChildren);
      setNewSpecialNeed("");
    }
  };

  const removeSpecialNeed = (childIndex: number, needIndex: number) => {
    const updatedChildren = [...children];
    updatedChildren[childIndex] = {
      ...updatedChildren[childIndex],
      specialNeeds: updatedChildren[childIndex].specialNeeds.filter(
        (_, i) => i !== needIndex
      ),
    };
    setChildren(updatedChildren);
  };

  const onSubmit = () => {
    onComplete(children);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        {children.map((_, index) => (
          <Button
            key={index}
            variant={activeChildIndex === index ? "default" : "outline"}
            onClick={() => setActiveChildIndex(index)}
            className="flex items-center gap-2"
          >
            Child {index + 1}
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
          Add Child
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormItem>
              <FormLabel>Child's Name</FormLabel>
              <FormControl>
                <Input
                  value={children[activeChildIndex]?.name || ""}
                  onChange={(e) => {
                    const updatedChildren = [...children];
                    updatedChildren[activeChildIndex] = {
                      ...updatedChildren[activeChildIndex],
                      name: e.target.value,
                    };
                    setChildren(updatedChildren);
                  }}
                  placeholder="Enter child's name"
                />
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={children[activeChildIndex]?.age || 0}
                  onChange={(e) => {
                    const updatedChildren = [...children];
                    updatedChildren[activeChildIndex] = {
                      ...updatedChildren[activeChildIndex],
                      age: parseInt(e.target.value) || 0,
                    };
                    setChildren(updatedChildren);
                  }}
                  min={0}
                  max={18}
                />
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel>Special Needs or Considerations</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newSpecialNeed}
                    onChange={(e) => setNewSpecialNeed(e.target.value)}
                    placeholder="Add special needs or considerations"
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
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {children[activeChildIndex]?.specialNeeds.map((need, index) => (
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
            </FormItem>

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
